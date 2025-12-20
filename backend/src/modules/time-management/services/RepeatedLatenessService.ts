// src/time-management/repeated-lateness/repeated-lateness.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TimeException, TimeExceptionDocument } from '../models/time-exception.schema';
import { TimeExceptionType, TimeExceptionStatus } from '../models/enums';
import { NotificationLog } from '../models/notification-log.schema';
import { AttendanceRecord, AttendanceRecordDocument } from '../models/attendance-record.schema';
import { LatenessRule, LatenessRuleDocument } from '../models/lateness-rule.schema';

@Injectable()
export class RepeatedLatenessService {
    private readonly logger = new Logger(RepeatedLatenessService.name);

    constructor(
        @InjectModel(TimeException.name) private readonly exceptionModel: Model<TimeExceptionDocument>,
        @InjectModel(AttendanceRecord.name) private readonly attendanceModel: Model<AttendanceRecordDocument>,
        @InjectModel(NotificationLog.name) private readonly notificationModel: Model<NotificationLog>,
        @InjectModel(LatenessRule.name) private readonly latenessRuleModel?: Model<LatenessRuleDocument>,
    ) {}

    /**
     * Check repeated lateness for an employee within a rolling window (days).
     * If threshold reached, mark found LATE exceptions as ESCALATED and create a NotificationLog,
     * and also create a summary TimeException of type MANUAL_ADJUSTMENT with reason REPEATED_LATENESS (if desired).
     */
    async evaluateAndEscalateIfNeeded(employeeId: Types.ObjectId | string, opts?: {
        windowDays?: number; threshold?: number;
        notifyHrId?: Types.ObjectId | string | null;
    }) {
        // Start with env/defaults
        let windowDays = opts?.windowDays ?? Number(process.env.LATENESS_THRESHOLD_WINDOW_DAYS ?? 90);
        let threshold = opts?.threshold ?? Number(process.env.LATENESS_THRESHOLD_OCCURRENCES ?? 3);

        // Allow override via a LatenessRule entry named 'REPEATED_LATENESS' (description contains JSON {windowDays, threshold})
        try {
            const ruleName = process.env.REPEATED_LATENESS_RULE_NAME ?? 'REPEATED_LATENESS';
            if (this.latenessRuleModel) {
                const rule = await this.latenessRuleModel.findOne({ name: ruleName }).lean();
                if (rule && rule.description) {
                    try {
                        const parsed = typeof rule.description === 'string' ? JSON.parse(rule.description) : rule.description;
                        if (parsed) {
                            if (parsed.windowDays && Number.isFinite(Number(parsed.windowDays))) {
                                // only override if opts didn't explicitly provide windowDays
                                if (opts?.windowDays === undefined) windowDays = Number(parsed.windowDays);
                            }
                            if (parsed.threshold && Number.isFinite(Number(parsed.threshold))) {
                                if (opts?.threshold === undefined) threshold = Number(parsed.threshold);
                            }
                        }
                    } catch (e) {
                        this.logger.debug('Failed to parse REPEATED_LATENESS rule description as JSON', e.message || e);
                    }
                }
            }
        } catch (e) {
            this.logger.debug('Failed to load REPEATED_LATENESS rule for overrides', e.message || e);
        }

        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - windowDays);

        const matchEmployee = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;

        // Build ObjectId range fallback for systems that don't have createdAt timestamps on exceptions
        const startHex = Math.floor(start.getTime() / 1000).toString(16).padStart(8, '0');
        const endHex = Math.floor(end.getTime() / 1000).toString(16).padStart(8, '0');
        const startObjectId = new Types.ObjectId(startHex + '0000000000000000');
        const endObjectId = new Types.ObjectId(endHex + 'ffffffffffffffff');

        // Find LATE exceptions (status not RESOLVED) within window so we can later attach summary to their attendance records
        const lateExceptions = await this.exceptionModel.find({
            employeeId: matchEmployee,
            type: TimeExceptionType.LATE,
            status: { $ne: TimeExceptionStatus.RESOLVED },
            $or: [
                { createdAt: { $gte: start, $lte: end } },
                { _id: { $gte: startObjectId, $lte: endObjectId } }
            ]
        }).lean();
        const lateCount = lateExceptions.length;

        this.logger.debug(`Employee ${matchEmployee} has ${lateCount} late exceptions in last ${windowDays} days`);

        if (lateCount < threshold) return { escalated: false, count: lateCount };

        // Avoid duplicate escalation: check if there's already a REPEATED_LATENESS escalation (we use a TimeException with reason marker)
        const existingEscalation = await this.exceptionModel.findOne({
            employeeId: matchEmployee,
            // use MANUAL_ADJUSTMENT as a generic type or create special reason
            type: TimeExceptionType.MANUAL_ADJUSTMENT,
            reason: { $regex: 'REPEATED_LATENESS_ESCALATION', $options: 'i' },
        }).lean();

        if (existingEscalation) {
            this.logger.debug(`Repeated lateness already escalated for ${matchEmployee}`);
            return { escalated: false, count: lateCount, alreadyEscalated: true };
        }

        // Mark existing LATE exceptions as ESCALATED (so they won't be re-processed)
        await this.exceptionModel.updateMany({
            employeeId: matchEmployee,
            type: TimeExceptionType.LATE,
            status: { $ne: TimeExceptionStatus.RESOLVED },
            $or: [
                { createdAt: { $gte: start, $lte: end } },
                { _id: { $gte: startObjectId, $lte: endObjectId } }
            ]
        }, {
            $set: { status: TimeExceptionStatus.ESCALATED }
        });

        // Create a summary/manual exception to record the escalation (this uses your existing type set)
        try {
            const summary = await this.exceptionModel.create({
                employeeId: matchEmployee,
                attendanceRecordId: null, // no single attendance record: optional
                type: TimeExceptionType.MANUAL_ADJUSTMENT,
                assignedTo: opts?.notifyHrId ? (typeof opts.notifyHrId === 'string' ? new Types.ObjectId(opts.notifyHrId) : opts.notifyHrId) : undefined,
                status: TimeExceptionStatus.ESCALATED,
                reason: `REPEATED_LATENESS_ESCALATION: ${lateCount} lateness events in ${windowDays} days`,
            } as any);
            // Attach the summary exception id to any attendance records referenced by the escalated late exceptions
            try {
                const attendanceIds = Array.from(new Set(lateExceptions.map(e => (e.attendanceRecordId || null)).filter(Boolean).map(String)));
                for (const attId of attendanceIds) {
                    try {
                        const att = await this.attendanceModel.findById(attId as any);
                        if (att) {
                            att.exceptionIds = att.exceptionIds || [];
                            const exists = att.exceptionIds.some(id => id?.toString?.() === (summary as any)._id.toString());
                            if (!exists) att.exceptionIds.push((summary as any)._id as any);
                            att.finalisedForPayroll = false;
                            await att.save();
                        }
                    } catch (inner) {
                        this.logger.warn(`Failed to attach summary exception to attendance ${attId}`, inner);
                    }
                }
            } catch (attachErr) {
                this.logger.warn('Failed to attach summary exception to attendance records', attachErr);
            }
            // Notify HR / manager via NotificationLog (recipient passed in opts or env)
            let hrId = undefined as Types.ObjectId | undefined;
            if (opts?.notifyHrId) {
                hrId = typeof opts.notifyHrId === 'string' ? new Types.ObjectId(opts.notifyHrId) : opts.notifyHrId as Types.ObjectId;
            } else if (process.env.HR_USER_ID) {
                hrId = new Types.ObjectId(process.env.HR_USER_ID);
            }

            let notifiedHrId: string | undefined = undefined;
            if (hrId) {
                try {
                    await this.notificationModel.create({
                        to: hrId,
                        type: 'REPEATED_LATENESS',
                        message: `Employee ${matchEmployee} has ${lateCount} late events in ${windowDays} days. Escalation created (${(summary as any)._id}).`,
                    } as any);
                    notifiedHrId = String(hrId);
                } catch (e) {
                    this.logger.warn('Failed to create REPEATED_LATENESS notification', e);
                }
            }
            // Return escalated result with notified HR id when applicable
            return { escalated: true, count: lateCount, notifiedHrId };
        } catch (e) {
            this.logger.error('Failed to create summary escalation exception / notification', e);
        }

        return { escalated: true, count: lateCount };
    }

    /**
     * Helper to get count for an employee (for UI or reporting)
     * @param employeeId employee ObjectId or string
     * @param opts optional flags: { onlyUnresolved: boolean }
     */
    async getLateCount(employeeId: Types.ObjectId | string, opts?: { onlyUnresolved?: boolean }) {
        const matchEmployee = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;
        // If caller requests only unresolved, apply status filter; otherwise count all LATE exceptions
        const filter: any = {
            employeeId: matchEmployee,
            type: TimeExceptionType.LATE,
        };
        if (opts?.onlyUnresolved) {
            filter.status = { $ne: TimeExceptionStatus.RESOLVED };
        }
        return await this.exceptionModel.countDocuments(filter);
    }
 }
