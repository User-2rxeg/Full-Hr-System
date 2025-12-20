// src/modules/time-management/services/time-exception-escalation.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class TimeExceptionEscalationScheduler {
    private readonly logger = new Logger(TimeExceptionEscalationScheduler.name);
    private isRunning = false;

    constructor(
        @InjectConnection() private readonly connection: Connection,
    ) {
        // Disabled catch-up on startup to prevent blocking and infinite loops
        // The CRON job at 08:00 will handle daily escalations
        // this.runCatchUp();
    }

    private async runCatchUp(): Promise<void> {
        try {
            this.logger.log('🔄 Running catch-up for time exception escalations...');
            await this.escalateUnreviewedTimeExceptions();
            this.logger.log('✓ Catch-up completed');
        } catch (error) {
            this.logger.error('Catch-up failed', error);
        }
    }

    /**
     * Runs daily at 8:00 AM (2 hours before shift expiry check at 10:00 AM)
     * Escalates unreviewed time exceptions before payroll cut-off
     * References payroll cutoff from active PayrollRuns
     * PUBLIC - can be called manually for testing
     */
    @Cron('0 8 * * *')
    public async escalateUnreviewedTimeExceptions() {
        // Prevent concurrent runs - only one instance should execute at a time
        if (this.isRunning) {
            this.logger.warn('[TimeExceptionEscalation] Scheduler is already running, skipping this execution');
            return;
        }

        this.isRunning = true;
        try {
            const now = new Date();
            const currentDay = now.getDate();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Get payroll cutoff day from active payroll run
            const payrollCutoffDay = await this.getPayrollCutoffDayFromActiveRun();

            // Skip execution if no active payroll run found
            if (payrollCutoffDay === null) {
                this.logger.debug('No active payroll run found. Skipping time exception escalation.');
                return;
            }
            const escalationDaysBeforeCutoff = Number(process.env.TIME_EXCEPTION_ESCALATION_DAYS ?? 2);

            // Calculate days until payroll cut-off
            let daysUntilCutoff = payrollCutoffDay - currentDay;
            if (daysUntilCutoff < 0) {
                // Already past cut-off this month, calculate to next month's cutoff
                const nextMonth = new Date(currentYear, currentMonth + 1, payrollCutoffDay);
                daysUntilCutoff = Math.ceil(
                    (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );
            }

            this.logger.log(
                `[TimeExceptionEscalation] Current day: ${currentDay}, Payroll cut-off: ${payrollCutoffDay}, Days until cut-off: ${daysUntilCutoff}`
            );

            // Only escalate if within the warning window before cut-off
            if (daysUntilCutoff > escalationDaysBeforeCutoff || daysUntilCutoff < 0) {
                this.logger.debug(
                    `Not in escalation window. Days until cutoff: ${daysUntilCutoff}, threshold: ${escalationDaysBeforeCutoff}`
                );
                return;
            }

            // Find unreviewed time exceptions
            const unreviewedExceptions = await this.findUnreviewedTimeExceptions();

            if (!unreviewedExceptions || unreviewedExceptions.length === 0) {
                this.logger.debug('No unreviewed time exceptions to escalate');
                return;
            }

            this.logger.log(`Found ${unreviewedExceptions.length} unreviewed time exceptions to process`);

            // Get HR users for escalation
            const hrUsers = await this.findHRUsers();
            if (!hrUsers || hrUsers.length === 0) {
                this.logger.warn('No HR/Admin users found for escalation');
                return;
            }

            let escalationCount = 0;

            for (const exception of unreviewedExceptions) {
                try {
                    // Check if escalation already exists to prevent duplicates
                    const existingEscalation = await this.connection.db
                        ?.collection('notificationlogs')
                        .findOne({
                            type: 'TIME_EXCEPTION_ESCALATION',
                            'metadata.exceptionId': exception._id?.toString(),
                        });

                    if (existingEscalation) {
                        this.logger.debug(`Escalation already exists for exception ${exception._id}`);
                        continue;
                    }

                    // Create escalation notification message
                    const escalationMsg = `🚨 ESCALATED: Time exception #${exception.referenceId || exception._id} (Employee: ${exception.employeeId}) requires urgent review. Payroll cut-off: ${payrollCutoffDay}. Action required within ${daysUntilCutoff} days.`;

                    // Create notification in database
                    await this.connection.db?.collection('notificationlogs').insertOne({
                        to: hrUsers[0].employeeProfileId,
                        type: 'TIME_EXCEPTION_ESCALATION',
                        message: escalationMsg,
                        priority: 'HIGH',
                        read: false,
                        metadata: {
                            exceptionId: exception._id?.toString(),
                            employeeId: exception.employeeId?.toString(),
                            daysUntilCutoff,
                            payrollCutoffDay,
                        },
                        createdAt: new Date(),
                    });

                    // Mark exception as escalated in time-exceptions collection
                    await this.connection.db?.collection('timeexceptions').updateOne(
                        { _id: exception._id },
                        {
                            $set: {
                                isEscalated: true,
                                escalatedAt: new Date(),
                            },
                        }
                    );

                    escalationCount++;
                    this.logger.log(`✓ Escalated time exception ${exception._id} to HR`);
                } catch (e) {
                    this.logger.warn(`Failed to escalate exception ${exception._id}`, e);
                }
            }

            this.logger.log(
                `[TimeExceptionEscalation] Successfully escalated ${escalationCount}/${unreviewedExceptions.length} time exceptions`
            );
        } catch (error) {
            this.logger.error('[TimeExceptionEscalation] Scheduler execution failed', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Get payroll cutoff day from the active payroll run
     * Queries payrollRuns collection and extracts the day from payrollPeriod
     * Returns null if no active payroll run is found (instead of throwing error)
     */
    private async getPayrollCutoffDayFromActiveRun(): Promise<number | null> {
        try {
            if (!this.connection.db) {
                this.logger.error('Database connection not available - cannot get payroll cutoff');
                return null;
            }

            // Query the most recent active payroll run from payrollRuns collection
            // Active statuses: INITIATED, IN_REVIEW, APPROVED, FROZEN
            const activePayroll = await this.connection.db
                .collection('payrollruns')
                .findOne(
                    {
                        status: { $in: ['INITIATED', 'IN_REVIEW', 'APPROVED', 'FROZEN'] }
                    },
                    { sort: { createdAt: -1 } }
                );

            if (!activePayroll) {
                this.logger.debug('No active payroll run found in database');
                return null;
            }

            // Extract cutoff day from payrollPeriod field
            // payrollPeriod is the actual payroll cutoff date (e.g., 31-01-2025)
            if (!activePayroll.payrollPeriod) {
                this.logger.error('payrollPeriod not found in active payroll run');
                return null;
            }

            const period = new Date(activePayroll.payrollPeriod);
            const cutoffDay = period.getDate();

            this.logger.log(
                `Using payroll cutoff day ${cutoffDay} from payrollPeriod (Period: ${period.toISOString().split('T')[0]})`
            );

            return cutoffDay;
        } catch (error) {
            this.logger.error('Failed to get payroll cutoff day from PayrollRuns', error);
            return null;
        }
    }

    /**
     * Find all unreviewed time exceptions
     * Status: PENDING, SUBMITTED, or UNDER_REVIEW
     * Excludes already escalated exceptions
     */
    private async findUnreviewedTimeExceptions(): Promise<any[]> {
        try {
            if (!this.connection.db) {
                this.logger.warn('Database not available');
                return [];
            }

            const exceptions = await this.connection.db
                .collection('timeexceptions')
                .find({
                    status: { $in: ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'] },
                    isEscalated: { $ne: true },
                })
                .toArray();

            return exceptions || [];
        } catch (error) {
            this.logger.error('Failed to find unreviewed time exceptions', error);
            return [];
        }
    }

    /**
     * Find all active HR/Admin users to receive escalation notifications
     * Searches employeesystemroles collection for HR-related roles
     */
    private async findHRUsers(): Promise<any[]> {
        try {
            if (!this.connection.db) {
                this.logger.warn('Database not available');
                return [];
            }

            // Find all HR/Admin roles
            const hrRoles = await this.connection.db
                .collection('employeesystemroles')
                .find({
                    roles: { $in: ['HR Manager', 'System Admin', 'HR Admin', 'Payroll Manager'] },
                    isActive: true,
                })
                .toArray();

            if (!hrRoles?.length) {
                this.logger.warn('No HR users found with required roles');
                return [];
            }

            // Get employee profile details for each HR role
            const employeeIds = hrRoles.map((r: any) => r.employeeProfileId);
            const employees = await this.connection.db
                .collection('employeeprofiles')
                .find({
                    _id: { $in: employeeIds },
                    isActive: true,
                })
                .toArray();

            // Merge role and employee data
            const hrUsers = hrRoles
                .map((role: any) => {
                    const emp = employees.find((e: any) => e._id.equals(role.employeeProfileId));
                    return emp ? { employeeProfileId: role.employeeProfileId, ...emp } : null;
                })
                .filter(Boolean);

            this.logger.debug(`Found ${hrUsers.length} active HR users for escalation`);
            return hrUsers;
        } catch (error) {
            this.logger.error('Failed to find HR users', error);
            return [];
        }
    }
}

