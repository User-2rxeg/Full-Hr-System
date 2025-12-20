import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { ShiftAssignment, ShiftAssignmentDocument } from '../models/shift-assignment.schema';
import { NotificationLog, NotificationLogDocument } from '../models/notification-log.schema';

@Injectable()
export class ShiftExpiryScheduler implements OnModuleInit {
    private readonly logger = new Logger(ShiftExpiryScheduler.name);

    /** Prevent concurrent scheduler executions */
    private isRunning = false;

    /** Prevent same assignment being processed twice in same run/process */
    private readonly assignmentLocks = new Set<string>();

    constructor(
        @InjectModel(ShiftAssignment.name)
        private readonly shiftAssignmentModel: Model<ShiftAssignmentDocument>,

        @InjectModel(NotificationLog.name)
        private readonly notificationModel: Model<NotificationLogDocument>,

        @InjectConnection()
        private readonly connection: Connection,
    ) {}

    async onModuleInit() {
        this.logger.log('[ShiftExpiryScheduler] Module initialized – running STARTUP check');
        await this.executeShiftExpiryCheck('STARTUP');
    }

    @Cron('0 10 * * *')
    async runDaily() {
        await this.executeShiftExpiryCheck('CRON');
    }

    private async executeShiftExpiryCheck(trigger: 'STARTUP' | 'CRON') {
        if (this.isRunning) {
            this.logger.warn(
                `[ShiftExpiryScheduler][${trigger}] ⛔ Scheduler already running – execution skipped`
            );
            return;
        }

        this.isRunning = true;

        let createdCount = 0;
        let skippedCount = 0;

        try {
            const days = Number(process.env.SHIFT_EXPIRY_NOTIFICATION_DAYS ?? 7);
            const now = new Date();
            const threshold = new Date();
            threshold.setDate(now.getDate() + days);
            threshold.setHours(23, 59, 59, 999);

            this.logger.log(
                `[ShiftExpiryScheduler][${trigger}] Checking assignments expiring in ${days} days`
            );

            const assignments = await this.shiftAssignmentModel
                .find({
                    endDate: { $exists: true, $gte: now, $lte: threshold },
                    status: { $in: ['PENDING', 'APPROVED'] },
                })
                .sort({ endDate: 1, _id: 1 })
                .lean();

            this.logger.log(
                `[ShiftExpiryScheduler][${trigger}] Found ${assignments.length} assignments`
            );

            if (!assignments.length) return;

            const hrUsers = await this.findHRUsers();
            this.logger.log(
                `[ShiftExpiryScheduler][${trigger}] Found ${hrUsers.length} HR users`
            );

            for (const a of assignments) {
                const assignmentId = a._id.toString();

                /** Assignment-level lock */
                if (this.assignmentLocks.has(assignmentId)) {
                    this.logger.warn(
                        `[ShiftExpiryScheduler][${trigger}] ⚠️ SKIPPED | Reason=ASSIGNMENT_LOCKED | Assignment=${assignmentId}`
                    );
                    skippedCount++;
                    continue;
                }

                this.assignmentLocks.add(assignmentId);

                try {
                    if (!a.endDate || !a.employeeId) {
                        this.logger.warn(
                            `[ShiftExpiryScheduler][${trigger}] ⚠️ SKIPPED | Reason=MISSING_FIELDS | Assignment=${assignmentId}`
                        );
                        skippedCount++;
                        continue;
                    }

                    if (new Date(a.endDate) < new Date()) {
                        this.logger.warn(
                            `[ShiftExpiryScheduler][${trigger}] ⚠️ SKIPPED | Reason=ALREADY_EXPIRED | Assignment=${assignmentId}`
                        );
                        skippedCount++;
                        continue;
                    }

                    /** ================= HR NOTIFICATIONS ================= */

                    const hrMessage =
                        `Shift assignment ${assignmentId} for employee ${a.employeeId} ` +
                        `expires on ${a.endDate.toISOString().slice(0, 10)}.`;

                    for (const hr of hrUsers) {
                        if (hr.employeeProfileId.toString() === a.employeeId.toString()) {
                            continue;
                        }

                        const hrAlreadyNotified = await this.notificationModel.exists({
                            to: hr.employeeProfileId,
                            type: 'SHIFT_EXPIRY',
                            'metadata.assignmentId': assignmentId,
                        });

                        if (hrAlreadyNotified) {
                            this.logger.warn(
                                `[ShiftExpiryScheduler][${trigger}] ⚠️ SKIPPED | Reason=HR_ALREADY_NOTIFIED | HR=${hr.employeeProfileId} | Assignment=${assignmentId}`
                            );
                            skippedCount++;
                            continue;
                        }

                        await this.notificationModel.create({
                            to: hr.employeeProfileId,
                            type: 'SHIFT_EXPIRY',
                            message: hrMessage,
                            metadata: {
                                assignmentId,
                                employeeId: a.employeeId.toString(),
                                shiftEndDate: a.endDate,
                            },
                        } as any);

                        createdCount++;
                        this.logger.log(
                            `[ShiftExpiryScheduler][${trigger}] ✅ HR notification sent | HR=${hr.employeeProfileId} | Assignment=${assignmentId}`
                        );
                    }

                    /** ================= EMPLOYEE NOTIFICATION ================= */

                    const employeeAlreadyNotified = await this.notificationModel.exists({
                        to: a.employeeId,
                        type: 'SHIFT_EXPIRY_EMPLOYEE',
                        'metadata.assignmentId': assignmentId,
                    });

                    if (employeeAlreadyNotified) {
                        this.logger.warn(
                            `[ShiftExpiryScheduler][${trigger}] ⚠️ SKIPPED | Reason=EMPLOYEE_ALREADY_NOTIFIED | Employee=${a.employeeId} | Assignment=${assignmentId}`
                        );
                        skippedCount++;
                        continue;
                    }

                    await this.notificationModel.create({
                        to: a.employeeId,
                        type: 'SHIFT_EXPIRY_EMPLOYEE',
                        message:
                            `Your shift assignment expires on ` +
                            `${a.endDate.toISOString().slice(0, 10)}. Please contact HR.`,
                        metadata: {
                            assignmentId,
                            employeeId: a.employeeId.toString(),
                            shiftEndDate: a.endDate,
                        },
                    } as any);

                    createdCount++;
                    this.logger.log(
                        `[ShiftExpiryScheduler][${trigger}] ✅ Employee notification sent | Employee=${a.employeeId} | Assignment=${assignmentId}`
                    );
                } catch (err) {
                    this.logger.error(
                        `[ShiftExpiryScheduler][${trigger}] ❌ Failed processing assignment ${assignmentId}`,
                        err,
                    );
                } finally {
                    this.assignmentLocks.delete(assignmentId);
                }
            }

            this.logger.log(
                `[ShiftExpiryScheduler][${trigger}] DONE | Created=${createdCount} | Skipped=${skippedCount}`
            );
        } catch (err) {
            this.logger.error(
                `[ShiftExpiryScheduler][${trigger}] Scheduler failed`,
                err,
            );
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * HR discovery logic – unchanged (your original implementation)
     */
    private async findHRUsers(): Promise<any[]> {
        if (!this.connection.db) return [];

        const HR_ROLE_CANDIDATES = ['HR Admin', 'HR_ADMIN', 'HRAdmin', 'hr admin'];
        const allHRUsers = new Map<string, any>();

        try {
            const profiles = await this.connection.db
                .collection('employee_system_roles')
                .find({
                    roles: { $in: HR_ROLE_CANDIDATES },
                    $or: [{ isActive: true }, { status: 'ACTIVE' }, { status: { $exists: false } }],
                })
                .toArray();

            profiles.forEach((p: any) => {
                allHRUsers.set(p._id.toString(), {
                    employeeProfileId: p._id,
                    workEmail: p.workEmail,
                    isActive: true,
                });
            });
        } catch {}

        return Array.from(allHRUsers.values());
    }
    //
}
