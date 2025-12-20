import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { NotificationLog, NotificationLogDocument } from '../models/notification-log.schema';
import { AttendanceRecord, AttendanceRecordDocument } from '../models/attendance-record.schema';
import { ShiftAssignment, ShiftAssignmentDocument } from '../models/shift-assignment.schema';
import { ScheduleRule, ScheduleRuleDocument } from '../models/schedule-rule.schema';
import { TimeException, TimeExceptionDocument } from '../models/time-exception.schema';
import { TimeExceptionStatus } from '../models/enums';
import {AttendanceCorrectionRequest} from "../models/attendance-correction-request.schema";
import {payrollRuns} from "../../payroll/payroll-execution/models/payrollRuns.schema";
import { CorrectionRequestStatus } from '../models/enums';
import { PayRollStatus } from '../../payroll/payroll-execution/enums/payroll-execution-enum';
// ==================== EXPORTED TYPE DEFINITIONS ====================


export interface DailyAttendanceStatus {
    date: string; // YYYY-MM-DD
    employeeId: string;
    status: 'ABSENT' | 'PRESENT' | 'HOLIDAY' | 'REST_DAY' | 'NO_SHIFT' | 'SCHEDULE_DAY_OFF' | 'ON_LEAVE';
    reason?: string;
    scheduledMinutes?: number;
    actualMinutes?: number;
}
interface PendingRequest {
    type: string;
    id: string;
    employeeId: string;
    createdAt: Date;
    status: string;
    reason: string;
    duration?: number; // Optional for break permissions
}

export interface AbsencePeriod {
    status: 'ABSENT' | 'PRESENT' | 'HOLIDAY' | 'REST_DAY' | 'NO_SHIFT' | 'SCHEDULE_DAY_OFF' | 'ON_LEAVE';
    startDate: Date;
    endDate: Date;
    dayCount: number;
    reason?: string;
}

export interface PayrollAbsenceData {
    employeeId: string;
    month: number;
    year: number;
    totalAbsenceMinutes: number;
    totalAbsentDays: number;
    approvedAbsenceMinutes: number;
    unapprovedAbsenceMinutes: number;
    absenceDays: Array<{ date: string; minutes: number; type: string; approved: boolean }>;
}

export interface RepeatedAbsenceResult {
    employeeId: string;
    lookbackDays: number;
    totalAbsenceDays: number;
    consecutiveAbsenceDays: number;
    absencePercentage: number;
    hasPattern: boolean;
    escalationLevel: 'NONE' | 'WARNING' | 'ALERT' | 'CRITICAL';
    recommendedAction?: string;
}

export interface MonthlyAttendanceReport {
    employeeId: string;
    month: number;
    year: number;
    presentDays: number;
    absentDays: number;
    holidayDays: number;
    restDays: number;
    leaveDays: number;
    totalScheduledDays: number;
    totalScheduledMinutes: number;
    totalActualMinutes: number;
    attendanceRate: number;
    absenceRate: number;
    absenceDetails: AbsencePeriod[];
    payrollData?: PayrollAbsenceData;
}

export interface SyncResult {
    date: string;
    totalRecords: number;
    payrollNotifications: number;
    leaveNotifications: number;
    skipped: number;
    errors: Array<{ recordId: any; error: string }>;
}

/**
 * AttendanceSyncService
 *
 * Handles:
 * - Absence detection and tracking
 * - Payroll synchronization
 * - Leave system integration
 * - Repeated absence monitoring
 * - Attendance reporting
 */
@Injectable()
export class AttendanceSyncService {
    private readonly logger = new Logger(AttendanceSyncService.name);

    constructor(
        @InjectModel('AttendanceRecord') private attendanceModel: Model<AttendanceRecordDocument>,
        @InjectModel(NotificationLog.name) private notificationModel: Model<NotificationLogDocument>,
        @InjectModel(ShiftAssignment.name) private shiftAssignmentModel: Model<ShiftAssignmentDocument>,
        @InjectModel(ScheduleRule.name) private scheduleRuleModel: Model<ScheduleRuleDocument>,
        @InjectModel(TimeException.name) private readonly timeExceptionModel: Model<TimeException>,
        @InjectModel(payrollRuns.name) private readonly payrollRunModel: Model<payrollRuns>,
        @InjectModel(AttendanceCorrectionRequest.name) private readonly correctionRequestModel: Model<AttendanceCorrectionRequest>,
        @InjectConnection() private connection: Connection,
        // Optional injection of external services - will be available if modules are imported
        @Optional() private readonly payrollService?: any,
        @Optional() private readonly leaveService?: any,
    ) {}

    // ==================== CRON JOB ====================
    /**
     * Daily sync scheduler - runs at 2 AM every day
     * Syncs previous day's attendance to payroll and leave systems
     */
    @Cron('0 2 * * *', {
        name: 'daily-attendance-sync',
        timeZone: 'UTC',
    })
    async scheduledDailySync() {
        this.logger.log('Starting scheduled daily attendance sync...');

        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const result = await this.syncAttendanceForDate(yesterday);

            this.logger.log(`Scheduled sync completed: ${JSON.stringify(result)}`);
        } catch (error) {
            this.logger.error('Scheduled sync failed:', error);
        }
    }

    // ==================== MAIN SYNC METHOD ====================
    /**
     * Sync attendance records for a specific date
     * Creates notification log entries for payroll and absence data
     *
     * Business Logic:
     * - PRESENT: workMinutes > 0
     * - ABSENT: workMinutes = 0 AND scheduled to work AND not holiday/rest day
     * - HOLIDAY: workMinutes = 0 AND is holiday
     * - REST_DAY: workMinutes = 0 AND is weekly rest day
     * - NO_SHIFT: workMinutes = 0 AND no shift assignment
     * - SCHEDULE_DAY_OFF: workMinutes = 0 AND not scheduled to work
     */
    async syncAttendanceForDate(date: Date): Promise<SyncResult> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        this.logger.log(`Syncing attendance for date: ${startOfDay.toISOString()}`);

        const hrUserId = this.getHrUserId();

        // Get all attendance records marked as finalized for payroll
        const records = await this.attendanceModel.find({
            finalisedForPayroll: true,
            'punches.time': { $gte: startOfDay, $lte: endOfDay },
        }).lean();

        this.logger.log(`Found ${records.length} attendance records to sync`);

        const result: SyncResult = {
            date: date.toISOString().split('T')[0],
            totalRecords: records.length,
            payrollNotifications: 0,
            leaveNotifications: 0,
            skipped: 0,
            errors: [],
        };

        for (const record of records) {
            try {
                const recordId = (record as any)._id?.toString();
                const employeeId = (record as any).employeeId?.toString();

                if (!recordId || !employeeId) {
                    result.errors.push({
                        recordId: recordId || 'unknown',
                        error: 'Record has no ID or employee ID',
                    });
                    continue;
                }

                // Check if notification already exists for this record on this date
                const existing = await this.notificationModel.findOne({
                    type: 'PAYROLL_SYNC_DATA',
                    createdAt: { $gte: startOfDay, $lte: endOfDay },
                    message: { $regex: `"attendanceRecordId":"${recordId}"` },
                });

                if (existing) {
                    result.skipped++;
                    continue;
                }

                // Determine the attendance status
                const status = await this.determineAttendanceStatus(
                    new Types.ObjectId(employeeId),
                    date,
                    record as any
                );

                // Create payroll notification with proper status
                await this.createPayrollNotification(record, date, status, hrUserId);
                result.payrollNotifications++;

                // Create absence notification ONLY if actually absent
                if (status === 'ABSENT') {
                    await this.createAbsenceNotification(record, date, hrUserId);
                    result.leaveNotifications++;
                }
            } catch (error: any) {
                result.errors.push({
                    recordId: (record as any)._id,
                    error: error.message,
                });
                this.logger.error(`Failed to sync record ${(record as any)._id}:`, error);
            }
        }

        return result;
    }

    // ==================== PAYROLL NOTIFICATION ====================
    /**
     * Create payroll sync notification with attendance data
     * AND sync with PayrollService if available
     */
    private async createPayrollNotification(
        record: any,
        date: Date,
        status: 'PRESENT' | 'ABSENT' | 'HOLIDAY' | 'REST_DAY' | 'NO_SHIFT' | 'SCHEDULE_DAY_OFF' | 'ON_LEAVE',
        hrUserId: Types.ObjectId
    ): Promise<void> {
        const workMinutes = record.totalWorkMinutes || 0;
        const workHours = workMinutes / 60;
        const dateStr = date.toISOString().split('T')[0];
        const recordId = (record as any)._id?.toString();
        const employeeId = (record as any).employeeId?.toString();

        if (!recordId || !employeeId) {
            throw new Error('Invalid record data - missing ID');
        }

        const payrollData = {
            employeeId: employeeId,
            attendanceRecordId: recordId,
            date: dateStr,
            workHours: Number(workHours.toFixed(2)),
            totalWorkMinutes: workMinutes,
            status: status,
            syncedAt: new Date().toISOString(),
        };

        // REAL SYNC: Call PayrollService if available
        let payrollServiceCalled = false;
        if (this.payrollService && typeof this.payrollService.registerAttendanceData === 'function') {
            try {
                await this.payrollService.registerAttendanceData(payrollData);
                payrollServiceCalled = true;
                this.logger.log(`✅ Synced attendance to PayrollService for employee ${employeeId} on ${dateStr}`);
            } catch (error: any) {
                this.logger.error(`❌ PayrollService sync failed for employee ${employeeId}:`, error.message);
                // Continue to create notification as fallback
            }
        } else if (!this.payrollService) {
            this.logger.debug(`PayrollService not injected - using notification log only`);
        }

        // ALWAYS create notification log (for audit trail and fallback)
        await this.notificationModel.create({
            to: hrUserId,
            type: 'PAYROLL_SYNC_DATA',
            message: JSON.stringify(payrollData),
            metadata: {
                employeeId: employeeId,
                date: dateStr,
                status: status,
                payrollServiceSynced: payrollServiceCalled,
            },
            createdAt: new Date(),
        });

        this.logger.debug(`Created payroll notification for employee ${employeeId} with status: ${status}`);
    }

    // ==================== ABSENCE NOTIFICATION ====================
    /**
     * Create absence notification for employees marked as ABSENT
     * Only called when employee was scheduled to work but didn't attend
     * AND sync with LeaveService if available
     */
    private async createAbsenceNotification(record: any, date: Date, hrUserId: Types.ObjectId): Promise<void> {
        const dateStr = date.toISOString().split('T')[0];
        const recordId = (record as any)._id?.toString();
        const employeeId = (record as any).employeeId?.toString();

        if (!recordId || !employeeId) {
            throw new Error('Invalid record data - missing ID');
        }

        const absenceData = {
            employeeId: employeeId,
            attendanceRecordId: recordId,
            date: dateStr,
            workHours: 0,
            totalWorkMinutes: 0,
            status: 'ABSENT',
            syncedAt: new Date().toISOString(),
            reason: 'Scheduled work day with no attendance punches',
        };

        // REAL SYNC: Call LeaveService if available
        let leaveServiceCalled = false;
        if (this.leaveService && typeof this.leaveService.registerAbsence === 'function') {
            try {
                await this.leaveService.registerAbsence(absenceData);
                leaveServiceCalled = true;
                this.logger.log(`✅ Synced absence to LeaveService for employee ${employeeId} on ${dateStr}`);
            } catch (error: any) {
                this.logger.error(`❌ LeaveService sync failed for employee ${employeeId}:`, error.message);
                // Continue to create notification as fallback
            }
        } else if (!this.leaveService) {
            this.logger.debug(`LeaveService not injected - using notification log only`);
        }

        // ALWAYS create notification log (for audit trail and fallback)
        await this.notificationModel.create({
            to: hrUserId,
            type: 'LEAVE_SYNC_ABSENCE',
            message: JSON.stringify(absenceData),
            metadata: {
                employeeId: employeeId,
                date: dateStr,
                status: 'ABSENT',
                leaveServiceSynced: leaveServiceCalled,
            },
            createdAt: new Date(),
        });

        this.logger.debug(`Created absence notification for employee ${employeeId} on ${dateStr}`);
    }

    // ==================== MANUAL SYNC ====================
    /**
     * Manual sync for date range
     */
    async syncDateRange(startDate: Date, endDate: Date): Promise<any> {
        this.logger.log(`Manual sync requested: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const results: SyncResult[] = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const result = await this.syncAttendanceForDate(new Date(currentDate));
            results.push(result);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return {
            startDate,
            endDate,
            totalDays: results.length,
            totalRecords: results.reduce((sum, r) => sum + r.totalRecords, 0),
            totalPayrollNotifications: results.reduce((sum, r) => sum + r.payrollNotifications, 0),
            totalAbsenceNotifications: results.reduce((sum, r) => sum + r.leaveNotifications, 0),
            dailyResults: results,
        };
    }


    // ==================== ABSENCE DETECTION ====================
    /**
     * Determine the attendance status for a specific record and date
     *
     * Returns:
     * - PRESENT: if workMinutes > 0
     * - HOLIDAY: if no work and day is holiday
     * - REST_DAY: if no work and day is weekly rest day
     * - ABSENT: if no work, scheduled to work, not holiday/rest day
     * - NO_SHIFT: if no work and no shift assignment
     * - SCHEDULE_DAY_OFF: if no work and not scheduled to work
     */
    private async determineAttendanceStatus(
        employeeId: Types.ObjectId,
        date: Date,
        record: any
    ): Promise<'PRESENT' | 'ABSENT' | 'HOLIDAY' | 'REST_DAY' | 'NO_SHIFT' | 'SCHEDULE_DAY_OFF' | 'ON_LEAVE'> {
        const workMinutes = record.totalWorkMinutes || 0;

        // Step 1: If employee worked, they are PRESENT
        if (workMinutes > 0) {
            return 'PRESENT';
        }

        // Step 2: Check for approved leave FIRST (before holiday/rest day checks)
        const leaveStatus = await this.checkApprovedLeaveForDate(employeeId, date);
        if (leaveStatus) {
            return leaveStatus.status; // Returns 'ON_LEAVE' or 'ABSENT'
        }

        // Step 3: Check if it's a holiday
        try {
            const isHoliday = await this.isHoliday(date);
            if (isHoliday) {
                return 'HOLIDAY';
            }
        } catch (e) {
            this.logger.warn('Holiday check failed during status determination', e);
        }

        // Step 4: Check if it's a weekly rest day
        try {
            const isRest = await this.isScheduleDayOff(employeeId, date);
            if (isRest) {
                return 'REST_DAY';
            }
        } catch (e) {
            this.logger.warn('Weekly rest check failed during status determination', e);
        }

        // Step 5: Check if employee has a shift assignment
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const assignment = await this.shiftAssignmentModel.findOne({
            employeeId,
            startDate: { $lte: dayEnd },
            $or: [
                { endDate: { $exists: false } },
                { endDate: null },
                { endDate: { $gte: dayStart } }
            ],
        }).lean();

        if (!assignment) {
            return 'NO_SHIFT';
        }

        // Step 6: Check if scheduled to work on this day
        const isScheduled = await this.isScheduledForDay(assignment, date);
        if (!isScheduled) {
            return 'SCHEDULE_DAY_OFF';
        }

        // Step 7: Employee was scheduled to work but has no attendance records
        return 'ABSENT';
    }

    /**
     * Calculate daily attendance status for a period
     * Determines if employee was ABSENT, PRESENT, on HOLIDAY, REST_DAY, NO_SHIFT, or SCHEDULE_DAY_OFF
     */
    async calculateAbsencesForPeriod(
        employeeId: string | Types.ObjectId,
        startDate: Date,
        endDate: Date
    ): Promise<DailyAttendanceStatus[]> {
        const empOid = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;
        const results: DailyAttendanceStatus[] = [];

        const dayStart = new Date(startDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(endDate);
        dayEnd.setHours(23, 59, 59, 999);

        // Get all records for this period
        const records = await this.attendanceModel.find({
            employeeId: empOid,
            'punches.time': { $gte: dayStart, $lte: dayEnd },
        }).lean();

        const recordsByDate = new Map<string, any>();
        records.forEach(rec => {
            if (rec.punches && rec.punches.length > 0) {
                const punchDate = new Date(rec.punches[0].time);
                const dateStr = punchDate.toISOString().split('T')[0];
                if (!recordsByDate.has(dateStr)) {
                    recordsByDate.set(dateStr, rec);
                }
            }
        });

        // Iterate through each day
        const currentDate = new Date(dayStart);
        while (currentDate <= dayEnd) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const status = await this.determineDailyStatus(empOid, currentDate, recordsByDate.get(dateStr));
            results.push(status);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return results;
    }

    /**
     * Determine daily attendance status for an employee on a specific date
     *
     * Business Logic Flow:
     * 1. If workMinutes > 0 → PRESENT
     * 2. If approved leave with balance → ON_LEAVE (deduct entitlement)
     * 3. If approved leave no balance → ABSENT
     * 4. If holiday → HOLIDAY
     * 5. If weekly rest day → REST_DAY
     * 6. If no shift → NO_SHIFT
     * 7. If not scheduled → SCHEDULE_DAY_OFF
     * 8. Default → ABSENT
     */
    // FIXED: Check non-work days BEFORE leave
    // FIXED: Check non-work days BEFORE leave
    private async determineDailyStatus(
        employeeId: Types.ObjectId,
        date: Date,
        record?: any
    ): Promise<DailyAttendanceStatus> {
        const dateStr = date.toISOString().split('T')[0];

        // ✅ STEP 1: Check if holiday FIRST
        try {
            const isHoliday = await this.isHoliday(date);
            if (isHoliday) {
                return {
                    date: dateStr,
                    employeeId: employeeId.toString(),
                    status: 'HOLIDAY',
                    reason: 'National or organizational holiday',
                };
            }
        } catch (e) {
            this.logger.warn('Holiday check failed', e);
        }

        // ✅ STEP 2: Check if standard weekly rest day (company-wide weekends)
        const isRestDay = this.isWeeklyRest(date); // Simple weekend check
        if (isRestDay) {
            return {
                date: dateStr,
                employeeId: employeeId.toString(),
                status: 'REST_DAY',
                reason: 'Standard weekly rest day (weekend)',
            };
        }

        // ✅ STEP 3: Check shift assignment
        const assignment = await this.getShiftAssignment(employeeId, date);
        if (!assignment) {
            return {
                date: dateStr,
                employeeId: employeeId.toString(),
                status: 'NO_SHIFT',
                reason: 'No shift assignment found for this date',
            };
        }

        // ✅ STEP 4: Check if individual schedule day off (not in employee's schedule pattern)
        const isScheduleDayOff = await this.isScheduleDayOff(employeeId, date);
        if (isScheduleDayOff) {
            return {
                date: dateStr,
                employeeId: employeeId.toString(),
                status: 'SCHEDULE_DAY_OFF',
                reason: 'Not scheduled to work today according to individual shift pattern',
            };
        }

        // ✅ STEP 5: Check if employee worked (ONLY if scheduled to work)
        if (record && record.totalWorkMinutes && record.totalWorkMinutes > 0) {
            return {
                date: dateStr,
                employeeId: employeeId.toString(),
                status: 'PRESENT',
                actualMinutes: record.totalWorkMinutes,
                scheduledMinutes: await this.getScheduledMinutesForDate(employeeId, date),
            };
        }

        // ✅ STEP 6: Check for approved leave
        const leaveStatus = await this.checkApprovedLeaveForDate(employeeId, date);
        if (leaveStatus && leaveStatus.status === 'ON_LEAVE') {
            return leaveStatus;
        }

        // ✅ STEP 7: Only now mark as ABSENT (they were scheduled but didn't show)
        return {
            date: dateStr,
            employeeId: employeeId.toString(),
            status: 'ABSENT',
            reason: 'No attendance recorded on scheduled work day',
            scheduledMinutes: await this.getScheduledMinutesForDate(employeeId, date),
            actualMinutes: 0,
        };
    }

// ✅ NEW METHOD: Check for standard weekly rest (weekends)
    private isWeeklyRest(date: Date): boolean {
        // Company-wide weekends (Saturday & Sunday)
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        return dayOfWeek === 0 || dayOfWeek === 6;
    }

// ✅ RENAMED METHOD: Check if day is off in employee's individual schedule
    private async isScheduleDayOff(employeeId: Types.ObjectId, date: Date): Promise<boolean> {
        try {
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const assignment = await this.shiftAssignmentModel.findOne({
                employeeId,
                startDate: { $lte: dayEnd },
                $or: [{ endDate: { $exists: false } }, { endDate: { $gte: dayStart } }],
            }).lean();

            if (!assignment?.scheduleRuleId) return false;

            const rule = await this.scheduleRuleModel.findById(assignment.scheduleRuleId).lean();
            if (!rule || !rule.active || !rule.pattern) return false;

            const pattern = (rule.pattern || '').toUpperCase();
            if (pattern.startsWith('WEEKLY:')) {
                const daysPart = pattern.split(':')[1] || '';
                const allowedDays = daysPart.split(',')
                    .map(d => d.trim().toUpperCase())
                    .filter(d => d.length > 0)
                    .map(d => d.length >= 3 ? d.substring(0, 3) : d);

                const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                const today = dayNames[date.getDay()];

                return !allowedDays.includes(today); // TRUE if NOT in schedule = day off
            }

            return false;
        } catch (e) {
            this.logger.warn('Schedule day off check failed', e);
            return false;
        }
    }

// ✅ Helper method to get shift assignment
    private async getShiftAssignment(employeeId: Types.ObjectId, date: Date): Promise<any | null> {
        try {
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const assignment = await this.shiftAssignmentModel.findOne({
                employeeId,
                startDate: { $lte: dayEnd },
                $or: [
                    { endDate: { $exists: false } },
                    { endDate: null },
                    { endDate: { $gte: dayStart } }
                ],
            }).lean();

            return assignment || null;
        } catch (error: any) {
            this.logger.error(`Error getting shift assignment:`, error);
            return null;
        }
    }/**
     * Check if employee has approved leave for the given date
     * Returns DailyAttendanceStatus if on leave, null otherwise
     */
    /**
     * Check if employee has approved leave for the given date
     * Returns DailyAttendanceStatus if on leave, null otherwise
     */
    private async checkApprovedLeaveForDate(employeeId: Types.ObjectId, date: Date): Promise<DailyAttendanceStatus | null> {
        try {
            const dateStr = date.toISOString().split('T')[0]; // Keep for logging

            // CRITICAL FIX: Convert input date to start/end of day in UTC
            const dayStart = new Date(date);
            dayStart.setUTCHours(0, 0, 0, 0); // Use UTC hours!

            const dayEnd = new Date(date);
            dayEnd.setUTCHours(23, 59, 59, 999); // Use UTC hours!

            this.logger.debug(`[DEBUG] Checking leave for ${employeeId} on ${dateStr} (UTC: ${dayStart.toISOString()} to ${dayEnd.toISOString()})`);

            // Query using UTC dates
            const leaveRequest = await this.connection.db!.collection('leaverequests').findOne({
                employeeId: employeeId,
                $and: [
                    { 'dates.from': { $lte: dayEnd } },
                    { 'dates.to': { $gte: dayStart } }
                ],
                status: { $in: ['APPROVED', 'Approved', 'approved', '2', 2] }
            });

            if (!leaveRequest) {
                this.logger.debug(`[DEBUG] No leave request found for ${employeeId} between UTC ${dayStart.toISOString()} and ${dayEnd.toISOString()}`);
                return null;
            }

            this.logger.debug(`[DEBUG] Found leave request: ${JSON.stringify({
                id: leaveRequest._id,
                status: leaveRequest.status,
                from: leaveRequest.dates?.from,
                to: leaveRequest.dates?.to,
                leaveTypeId: leaveRequest.leaveTypeId,
                // Log both UTC and local for debugging
                fromLocal: leaveRequest.dates?.from ? new Date(leaveRequest.dates.from).toLocaleString() : null,
                toLocal: leaveRequest.dates?.to ? new Date(leaveRequest.dates.to).toLocaleString() : null
            }, null, 2)}`);

            // Rest of the method remains the same...
            const hasBalance = await this.checkEntitlementBalance(employeeId, leaveRequest.leaveTypeId);

            if (hasBalance) {
                // Deduct entitlement and return ON_LEAVE
                await this.deductEntitlementForLeaveDay(employeeId, leaveRequest.leaveTypeId, date);

                return {
                    date: dateStr,
                    employeeId: employeeId.toString(),
                    status: 'ON_LEAVE' as const,
                    reason: `On approved ${leaveRequest.leaveType || 'leave'}`,
                    scheduledMinutes: await this.getScheduledMinutesForDate(employeeId, date),
                    actualMinutes: 0,
                };
            } else {
                this.logger.warn(`Employee ${employeeId} has approved leave but insufficient balance on ${dateStr}`);
                return null;
            }

        } catch (error: any) {
            this.logger.error(`[ERROR] checkApprovedLeaveForDate failed:`, error);
            return null;
        }
    }
    /**
     * Check if employee has available entitlement balance for a leave type
     *
     * @param employeeId - Employee ID
     * @param leaveTypeId - Leave type ID
     * @returns true if balance > 0, false otherwise
     */
    /**
     * Check if employee has available entitlement balance for a leave type
     */
    private async checkEntitlementBalance(employeeId: Types.ObjectId, leaveTypeId: Types.ObjectId): Promise<boolean> {
        try {
            // Query entitlements collection - use correct schema fields
            const entitlement = await this.connection.db!.collection('leaveentitlements').findOne({
                employeeId: employeeId,
                leaveTypeId: leaveTypeId,
            });

            if (!entitlement) {
                this.logger.warn(`No entitlement record found for employee ${employeeId} and leave type ${leaveTypeId}`);
                return false;
            }

            // ✅ Use correct field names from your schema
            const remaining = entitlement.remaining || 0;
            const taken = entitlement.taken || 0;
            const pending = entitlement.pending || 0;
            const accrued = entitlement.accruedRounded || entitlement.accruedActual || 0;
            const carryForward = entitlement.carryForward || 0;

            // Calculate available balance
            // Calculate total available
            const totalAvailable = (accrued || 0) + (carryForward || 0);
            const totalUsed = (taken || 0) + (pending || 0);
            const availableBalance = totalAvailable - totalUsed;

            return availableBalance > 0;
            this.logger.debug(`Entitlement check: employee ${employeeId}, remaining: ${remaining}, available: ${availableBalance}`);

            return availableBalance > 0;
        } catch (error: any) {
            this.logger.error(`Error checking entitlement balance:`, error);
            return false;
        }
    }
    /**
     * Deduct 1 day (or proportional minutes) from entitlement balance
     * This prevents double deduction and tracks which days were deducted
     *
     * @param employeeId - Employee ID
     * @param leaveTypeId - Leave type ID
     * @param date - Date of leave
     */
    /**
     * Deduct 1 day from entitlement balance when employee takes leave
     * Creates notification log for audit trail and integration
     *
     * @param employeeId - Employee ID
     * @param leaveTypeId - Leave type ID
     * @param date - Date of leave
     */
    private async deductEntitlementForLeaveDay(employeeId: Types.ObjectId, leaveTypeId: Types.ObjectId, date: Date): Promise<void> {
        try {
            const dateStr = date.toISOString().split('T')[0];

            // Check if already deducted for this day (idempotency check)
            const existing = await this.connection.db!.collection('leave_deductions').findOne({
                employeeId: employeeId,
                leaveTypeId: leaveTypeId,
                date: dateStr,
            });

            if (existing) {
                this.logger.debug(`Entitlement already deducted for ${employeeId} on ${dateStr}`);
                return;
            }

            // Update entitlement record in correct collection
            const result = await this.connection.db!.collection('leaveentitlements').updateOne(
                {
                    employeeId: employeeId,
                    leaveTypeId: leaveTypeId,
                },
                {
                    $inc: {
                        taken: 1,  // Increment taken days by 1
                        remaining: -1  // Decrement remaining by 1
                    },
                    $set: { lastAccrualDate: new Date() },
                }
            );

            if (result.modifiedCount === 0) {
                this.logger.warn(`No entitlement record updated for ${employeeId} and leave type ${leaveTypeId}`);
                return;
            }

            // Record the deduction for audit trail
            await this.connection.db!.collection('leave_deductions').insertOne({
                employeeId: employeeId,
                leaveTypeId: leaveTypeId,
                date: dateStr,
                daysDeducted: 1,  // Changed from minutesDeducted to daysDeducted
                createdAt: new Date(),
                _id: new Types.ObjectId(),
            });

            // Create notification log for leave entitlement deduction
            const hrUserId = this.getHrUserId();
            const leaveData = {
                employeeId: employeeId.toString(),
                leaveTypeId: leaveTypeId.toString(),
                date: dateStr,
                daysDeducted: 1,
                action: 'ENTITLEMENT_DEDUCTED',
                syncedAt: new Date().toISOString(),
            };

            // REAL SYNC: Call LeaveService if available
            let leaveServiceCalled = false;
            if (this.leaveService && typeof this.leaveService.deductLeaveBalance === 'function') {
                try {
                    await this.leaveService.deductLeaveBalance({
                        employeeId: employeeId.toString(),
                        leaveTypeId: leaveTypeId.toString(),
                        date: dateStr,
                        daysDeducted: 1,
                    });
                    leaveServiceCalled = true;
                    this.logger.log(`✅ Synced leave balance deduction to LeaveService for employee ${employeeId}`);
                } catch (error: any) {
                    this.logger.error(`❌ LeaveService leave balance deduction failed for employee ${employeeId}:`, error.message);
                    // Continue to create notification as fallback
                }
            } else if (!this.leaveService) {
                this.logger.debug(`LeaveService not injected - using notification log only for leave deduction`);
            }

            // ALWAYS create notification log (for audit trail and fallback)
            await this.notificationModel.create({
                to: hrUserId,
                type: 'LEAVE_ENTITLEMENT_DEDUCTED',
                message: JSON.stringify(leaveData),
                metadata: {
                    employeeId: employeeId.toString(),
                    leaveTypeId: leaveTypeId.toString(),
                    date: dateStr,
                    action: 'ENTITLEMENT_DEDUCTED',
                    leaveServiceSynced: leaveServiceCalled,
                },
                createdAt: new Date(),
            });

            this.logger.debug(`Deducted 1 day from entitlement for employee ${employeeId} on ${dateStr}`);
            this.logger.log(`✅ Leave entitlement notification logged for employee ${employeeId}`);
        } catch (error: any) {
            this.logger.error(`Error deducting entitlement:`, error);
            // Don't throw - log error and continue
        }
    }

    /**
     * Get shift assignment for employee on a given date
     * Extracted helper method for reusability
     */
    /**
     * Get scheduled minutes for a specific date
     * Based on shift assignment and schedule rule
     */
    private async getScheduledMinutesForDate(employeeId: Types.ObjectId, date: Date): Promise<number> {
        try {
            const assignment = await this.getShiftAssignment(employeeId, date);
            if (!assignment) return 0;

            const shift = await this.connection.db!.collection('shifts').findOne({ _id: assignment.shiftId });
            if (!shift) return 0;

            const [sh, sm] = (shift.startTime || '00:00').split(':').map(Number);
            const [eh, em] = (shift.endTime || '00:00').split(':').map(Number);

            const start = new Date(date);
            start.setHours(sh, sm, 0, 0);

            const end = new Date(date);
            end.setHours(eh, em, 0, 0);

            // Handle shifts that span midnight
            if (end.getTime() <= start.getTime()) {
                end.setDate(end.getDate() + 1);
            }

            return Math.ceil((end.getTime() - start.getTime()) / 60000);
        } catch (error: any) {
            this.logger.warn(`Failed to get scheduled minutes for employee ${employeeId} on ${date.toDateString()}:`, error);
            return 0;
        }
    }

    /**
     * Check if employee is scheduled for a specific day
     */
    private async isScheduledForDay(assignment: any, date: Date): Promise<boolean> {
        if (!assignment.scheduleRuleId) return true;

        const rule = await this.scheduleRuleModel.findById(assignment.scheduleRuleId).lean();
        if (!rule || !rule.active || !rule.pattern) return true;

        const pattern = (rule.pattern || '').toUpperCase();
        if (pattern.startsWith('WEEKLY:')) {
            const daysPart = pattern.split(':')[1] || '';
            const allowedDays = daysPart.split(',').map(d => d.trim().slice(0, 3).toUpperCase());
            const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const today = dayNames[date.getDay()];
            return allowedDays.includes(today);
        } else if (pattern.startsWith('DAILY')) {
            return true;
        }

        return true;
    }

    /**
     * Get scheduled minutes for a day
     */
    private async getScheduledMinutes(assignment: any, date: Date): Promise<number> {
        try {
            const shift = await this.connection.db!.collection('shifts').findOne({ _id: assignment.shiftId });
            if (!shift) return 0;

            const [sh, sm] = (shift.startTime || '00:00').split(':').map(Number);
            const [eh, em] = (shift.endTime || '00:00').split(':').map(Number);

            const start = new Date(date);
            start.setHours(sh, sm, 0, 0);

            const end = new Date(date);
            end.setHours(eh, em, 0, 0);

            if (end.getTime() <= start.getTime()) {
                end.setDate(end.getDate() + 1);
            }

            return Math.ceil((end.getTime() - start.getTime()) / 60000);
        } catch (e) {
            this.logger.warn('Failed to get scheduled minutes', e);
            return 0;
        }
    }

    // ==================== PAYROLL ABSENCE SYNC ====================
    /**
     * Calculate absence data for payroll for a specific month
     * Also creates notification log for audit trail and integration
     */
    async syncAbsencesToPayroll(
        employeeId: string | Types.ObjectId,
        month: number,
        year: number
    ): Promise<PayrollAbsenceData> {
        const empOid = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;

        const startDate = new Date(year, month - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(year, month, 0);
        endDate.setHours(23, 59, 59, 999);

        const absences = await this.calculateAbsencesForPeriod(empOid, startDate, endDate);

        const absenceRecords = absences.filter(a => a.status === 'ABSENT');
        const totalAbsenceMinutes = absenceRecords.reduce((sum, a) => sum + (a.scheduledMinutes || 0), 0);

        // Get approved exceptions for this period
        const approvedExceptions = await this.timeExceptionModel.find({
            employeeId: empOid,
            status: { $in: [TimeExceptionStatus.APPROVED] },
            createdAt: { $gte: startDate, $lte: endDate },
        }).lean();

        const approvedMinutes = approvedExceptions.reduce((sum, ex) => {
            // Estimate minutes based on type - this would need actual implementation
            const typeMinutes: Record<string, number> = {
                MISSED_PUNCH: 480, // 8 hours default
                SHORT_TIME: 120, // 2 hours default
            };
            return sum + (typeMinutes[ex.type] || 0);
        }, 0);

        const unapprovedMinutes = Math.max(0, totalAbsenceMinutes - approvedMinutes);

        const payrollData: PayrollAbsenceData = {
            employeeId: empOid.toString(),
            month,
            year,
            totalAbsenceMinutes,
            totalAbsentDays: absenceRecords.length,
            approvedAbsenceMinutes: approvedMinutes,
            unapprovedAbsenceMinutes: unapprovedMinutes,
            absenceDays: absenceRecords.map(a => ({
                date: a.date,
                minutes: a.scheduledMinutes || 0,
                type: a.reason || 'ABSENT',
                approved: false, // Would need to check exceptions
            })),
        };

        // REAL SYNC: Call PayrollService if available
        let payrollServiceCalled = false;
        if (this.payrollService && typeof this.payrollService.registerMonthlyAbsences === 'function') {
            try {
                await this.payrollService.registerMonthlyAbsences(payrollData);
                payrollServiceCalled = true;
                this.logger.log(`✅ Synced monthly absences to PayrollService for employee ${empOid} for ${month}/${year}`);
            } catch (error: any) {
                this.logger.error(`❌ PayrollService monthly absences sync failed for employee ${empOid}:`, error.message);
                // Continue to create notification as fallback
            }
        } else if (!this.payrollService) {
            this.logger.debug(`PayrollService not injected - using notification log only for payroll sync`);
        }

        // Create notification log for payroll sync
        try {
            const hrUserId = this.getHrUserId();
            await this.notificationModel.create({
                to: hrUserId,
                type: 'PAYROLL_ABSENCE_SYNC',
                message: JSON.stringify(payrollData),
                metadata: {
                    employeeId: empOid.toString(),
                    month,
                    year,
                    totalAbsentDays: absenceRecords.length,
                    totalAbsenceMinutes,
                    action: 'PAYROLL_ABSENCE_SYNC',
                    payrollServiceSynced: payrollServiceCalled,
                },
                createdAt: new Date(),
            });

            this.logger.log(`✅ Payroll absence sync notification logged for employee ${empOid} for ${month}/${year}`);
        } catch (error: any) {
            this.logger.error(`Error creating payroll sync notification:`, error);
            // Don't throw - continue with return
        }

        return payrollData;
    }

    // ==================== REPEATED ABSENCE DETECTION ====================
    /**
     * Check for patterns of repeated absences
     */
    async checkForRepeatedAbsences(
        employeeId: string | Types.ObjectId,
        lookbackDays: number = 30
    ): Promise<RepeatedAbsenceResult> {
        const empOid = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;

        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - lookbackDays);
        startDate.setHours(0, 0, 0, 0);

        const absences = await this.calculateAbsencesForPeriod(empOid, startDate, endDate);
        const absentRecords = absences.filter(a => a.status === 'ABSENT');

        const totalScheduledDays = absences.filter(a =>
            a.status === 'ABSENT' || a.status === 'PRESENT'
        ).length;

        const totalAbsentDays = absentRecords.length;
        const absencePercentage = totalScheduledDays > 0 ? (totalAbsentDays / totalScheduledDays) * 100 : 0;

        // Calculate consecutive absences
        let maxConsecutive = 0;
        let currentConsecutive = 0;

        absentRecords.forEach(() => {
            currentConsecutive++;
            if (currentConsecutive > maxConsecutive) {
                maxConsecutive = currentConsecutive;
            }
        });

        // Determine escalation level
        let escalationLevel: 'NONE' | 'WARNING' | 'ALERT' | 'CRITICAL' = 'NONE';
        let recommendedAction: string | undefined;

        if (maxConsecutive >= 5) {
            escalationLevel = 'CRITICAL';
            recommendedAction = 'Immediate disciplinary review recommended';
        } else if (maxConsecutive >= 3) {
            escalationLevel = 'ALERT';
            recommendedAction = 'Manager notification and pattern investigation';
        } else if (absencePercentage > 20) {
            escalationLevel = 'WARNING';
            recommendedAction = 'Monitor attendance closely';
        }

        return {
            employeeId: empOid.toString(),
            lookbackDays,
            totalAbsenceDays: totalAbsentDays,
            consecutiveAbsenceDays: maxConsecutive,
            absencePercentage: Math.round(absencePercentage * 100) / 100,
            hasPattern: maxConsecutive >= 3 || absencePercentage > 20,
            escalationLevel,
            recommendedAction,
        };
    }

    // ==================== ATTENDANCE REPORTING ====================
    /**
     * Generate monthly attendance report
     */
    async generateMonthlyAttendanceReport(
        employeeId: string | Types.ObjectId,
        month: number,
        year: number
    ): Promise<MonthlyAttendanceReport> {
        const empOid = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;

        const startDate = new Date(year, month - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(year, month, 0);
        endDate.setHours(23, 59, 59, 999);

        const dailyStatuses = await this.calculateAbsencesForPeriod(empOid, startDate, endDate);

        const presentDays = dailyStatuses.filter(d => d.status === 'PRESENT').length;
        const absentDays = dailyStatuses.filter(d => d.status === 'ABSENT').length;
        const holidayDays = dailyStatuses.filter(d => d.status === 'HOLIDAY').length;
        const restDays = dailyStatuses.filter(d => d.status === 'REST_DAY').length;
        const leaveDays = dailyStatuses.filter(d => d.status === 'ON_LEAVE').length;

        const totalScheduledDays = presentDays + absentDays;
        const totalScheduledMinutes = dailyStatuses.reduce((sum, d) => sum + (d.scheduledMinutes || 0), 0);
        const totalActualMinutes = dailyStatuses.reduce((sum, d) => sum + (d.actualMinutes || 0), 0);

        const attendanceRate = totalScheduledDays > 0
            ? (presentDays / totalScheduledDays) * 100
            : 0;

        const absenceRate = 100 - attendanceRate;

        // Build absence periods
        const absencePeriods: AbsencePeriod[] = [];
        let currentPeriod: AbsencePeriod | null = null;

        dailyStatuses.forEach(status => {
            if (status.status === 'ABSENT') {
                if (!currentPeriod) {
                    currentPeriod = {
                        status: 'ABSENT',
                        startDate: new Date(status.date),
                        endDate: new Date(status.date),
                        dayCount: 1,
                        reason: status.reason,
                    };
                } else {
                    currentPeriod.endDate = new Date(status.date);
                    currentPeriod.dayCount++;
                }
            } else {
                if (currentPeriod) {
                    absencePeriods.push(currentPeriod);
                    currentPeriod = null;
                }
            }
        });

        if (currentPeriod) {
            absencePeriods.push(currentPeriod);
        }

        const payrollData = await this.syncAbsencesToPayroll(empOid, month, year);

        return {
            employeeId: empOid.toString(),
            month,
            year,
            presentDays,
            absentDays,
            holidayDays,
            restDays,
            leaveDays,
            totalScheduledDays,
            totalScheduledMinutes,
            totalActualMinutes,
            attendanceRate: Math.round(attendanceRate * 100) / 100,
            absenceRate: Math.round(absenceRate * 100) / 100,
            absenceDetails: absencePeriods,
            payrollData,
        };
    }

    // ==================== UTILITY METHODS ====================
    /**
     * Check if date is a holiday
     */
    private async isHoliday(date: Date): Promise<boolean> {
        try {
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const holiday = await this.connection.db!.collection('holidays').findOne({
                date: { $gte: dayStart, $lte: dayEnd },
                active: true,
            });
            return !!holiday;
        } catch (e) {
            this.logger.warn('Holiday check failed', e);
            return false;
        }
    }

    /**
     * Check if date is a weekly rest day based on schedule rule
     */// RENAME THIS: isWeeklyRest → isScheduleDayOff
    // private async isScheduleDayOff(employeeId: Types.ObjectId, date: Date): Promise<boolean> {
    //     // Keep all the existing logic from your current isWeeklyRest() method
    //     // This checks if a day is NOT in employee's schedule pattern
    //     try {
    //         const dayStart = new Date(date);
    //         dayStart.setHours(0, 0, 0, 0);
    //         const dayEnd = new Date(date);
    //         dayEnd.setHours(23, 59, 59, 999);
    //
    //         const assignment = await this.shiftAssignmentModel.findOne({
    //             employeeId,
    //             startDate: { $lte: dayEnd },
    //             $or: [{ endDate: { $exists: false } }, { endDate: { $gte: dayStart } }],
    //         }).lean();
    //
    //         if (!assignment?.scheduleRuleId) return false;
    //
    //         const rule = await this.scheduleRuleModel.findById(assignment.scheduleRuleId).lean();
    //         if (!rule || !rule.active || !rule.pattern) return false;
    //
    //         const pattern = (rule.pattern || '').toUpperCase();
    //         if (pattern.startsWith('WEEKLY:')) {
    //             const daysPart = pattern.split(':')[1] || '';
    //             const allowedDays = daysPart.split(',').map(d => d.trim().slice(0, 3).toUpperCase());
    //             const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    //             const today = dayNames[date.getDay()];
    //             return !allowedDays.includes(today); // TRUE if day is OFF in schedule
    //         }
    //
    //         return false;
    //     } catch (e) {
    //         this.logger.warn('Schedule day off check failed', e);
    //         return false;
    //     }
    // }
    /**
     * Get HR user ID from environment or default
     */
    private getHrUserId(): Types.ObjectId {
        const envHrId = process.env.HR_USER_ID;
        if (envHrId && Types.ObjectId.isValid(envHrId)) {
            return new Types.ObjectId(envHrId);
        }

        const systemUserId = process.env.SYSTEM_USER_ID;
        if (systemUserId && Types.ObjectId.isValid(systemUserId)) {
            return new Types.ObjectId(systemUserId);
        }

        return new Types.ObjectId('000000000000000000000001');
    }

    /**
     * Get sync statistics based on notification logs
     */
    async getSyncStatistics(startDate?: Date, endDate?: Date): Promise<any> {
        const query: any = {};

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = startDate;
            if (endDate) query.createdAt.$lte = endDate;
        }

        const totalNotifications = await this.notificationModel.countDocuments(query);
        const payrollNotifications = await this.notificationModel.countDocuments({
            ...query,
            type: 'PAYROLL_SYNC_DATA',
        });
        const leaveNotifications = await this.notificationModel.countDocuments({
            ...query,
            type: 'LEAVE_SYNC_ABSENCE',
        });

        return {
            period: {
                startDate: startDate || 'All time',
                endDate: endDate || 'Present',
            },
            totalNotifications,
            payrollNotifications,
            leaveNotifications,
            payrollRate: totalNotifications > 0
                ? ((payrollNotifications / totalNotifications) * 100).toFixed(2) + '%'
                : '0%',
            absenceRate: totalNotifications > 0
                ? ((leaveNotifications / totalNotifications) * 100).toFixed(2) + '%'
                : '0%',
        };
    }

    // ==================== CONFLICT MANAGEMENT ====================
    /**
     * Get sync conflicts (absence notifications that need review)
     */
    async getSyncConflicts(filters?: {
        employeeId?: string;
        startDate?: Date;
        endDate?: Date;
        resolved?: boolean;
    }): Promise<any[]> {
        const query: any = { type: 'LEAVE_SYNC_ABSENCE' };

        if (filters?.employeeId) {
            query.message = { $regex: `"employeeId":"${filters.employeeId}"` };
        }

        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate) query.createdAt.$gte = filters.startDate;
            if (filters.endDate) query.createdAt.$lte = filters.endDate;
        }

        return this.notificationModel.find(query).sort({ createdAt: -1 }).lean();
    }

    /**
     * Resolve a sync conflict by creating a resolution record
     */
    async resolveConflict(
        conflictId: string,
        resolution: {
            action: 'KEEP_ATTENDANCE' | 'KEEP_LEAVE' | 'CONVERT_TO_HALF_DAY' | 'MANUAL_REVIEW';
            note?: string;
            resolvedBy: string;
        }
    ): Promise<void> {
        // Create a resolution notification log entry
        await this.notificationModel.create({
            to: this.getHrUserId(),
            type: 'CONFLICT_RESOLUTION',
            message: JSON.stringify({
                conflictNotificationId: conflictId,
                resolution: resolution,
                resolvedAt: new Date().toISOString(),
                resolvedBy: resolution.resolvedBy,
            }),
            createdAt: new Date(),
        });

        this.logger.log(`Conflict ${conflictId} resolved with action: ${resolution.action}`);
    }

    /**
     * Count absences for an employee within a date range
     * Returns detailed breakdown of absence types and count
     *
     * @param employeeId - Employee ID (string or ObjectId)
     * @param startDate - Start date of the range
     * @param endDate - End date of the range
     * @returns Object containing absence count and breakdown
     */
    async countAbsencesByDateRange(
        employeeId: string | Types.ObjectId,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        const empOid = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;

        this.logger.log(`Counting absences for employee ${empOid} from ${startDate.toDateString()} to ${endDate.toDateString()}`);

        // Get daily statuses for the period
        const dailyStatuses = await this.calculateAbsencesForPeriod(empOid, startDate, endDate);

        // Count each status type
        const absenceDays = dailyStatuses.filter(d => d.status === 'ABSENT');
        const presentDays = dailyStatuses.filter(d => d.status === 'PRESENT');
        const holidayDays = dailyStatuses.filter(d => d.status === 'HOLIDAY');
        const restDays = dailyStatuses.filter(d => d.status === 'REST_DAY');
        const noShiftDays = dailyStatuses.filter(d => d.status === 'NO_SHIFT');
        const scheduledDayOffDays = dailyStatuses.filter(d => d.status === 'SCHEDULE_DAY_OFF');
        const leaveDays = dailyStatuses.filter(d => d.status === 'ON_LEAVE');

        const totalDays = dailyStatuses.length;
        const absenceCount = absenceDays.length;
        const absenceRate = totalDays > 0 ? Math.round((absenceCount / totalDays) * 100 * 100) / 100 : 0;

        const result = {
            employeeId: empOid.toString(),
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            totalDays,
            absenceDays: absenceCount-1,
            presentDays: presentDays.length,
            holidayDays: holidayDays.length,
            restDays: restDays.length,
            noShiftDays: noShiftDays.length,
            scheduledDayOffDays: scheduledDayOffDays.length,
            leaveDays: leaveDays.length,
            absenceRate, // Percentage (0-100)
            absences: absenceDays.map(d => ({
                date: d.date,
                status: d.status,
                reason: d.reason || 'No attendance recorded on scheduled work day',
            })),
        };

        this.logger.log(`Absence count result: ${absenceCount} absences out of ${totalDays} days (${absenceRate}%)`);

        return result;
    }

    // ==================== TIME REQUEST ESCALATION ====================
     /**
      * Automatic escalation of pending time requests before payroll cut-off
      * Prevents payroll delays by ensuring all time requests are reviewed
      * Runs 5 days before end of month (on the 25th or 26th)
      */
    @Cron('0 8 25-28 * *', {
        name: 'time-request-escalation',
        timeZone: 'UTC',
    })
    async escalatePendingTimeRequests() {
        this.logger.log('Starting automatic escalation of pending time requests...');

        try {
            // Get current date
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;

            // Get payroll cut-off date (configurable, default is last day of month or 25th - adjust as needed)
            const payrollCutoffDate = this.getPayrollCutoffDate(year, month);

            this.logger.log(`Payroll cut-off date: ${payrollCutoffDate.toDateString()}`);

            // Escalate leave requests
            const leaveEscalations = await this.escalateLeaveRequests(payrollCutoffDate);

            // Escalate time exceptions
            const exceptionEscalations = await this.escalateTimeExceptions(payrollCutoffDate);

            const hrUserId = this.getHrUserId();

            // 1) Escalate attendance correction requests that are still SUBMITTED or IN_REVIEW
            const corrColl = this.connection.db!.collection('attendancecorrectionrequests');
            const correctionsToEscalate = await corrColl.find({
                status: { $in: ['SUBMITTED', 'IN_REVIEW'] },
                createdAt: { $lte: payrollCutoffDate },
            }).toArray();

            for (const c of correctionsToEscalate) {
                try {
                    if (!c) continue;
                    if (String(c.status).toUpperCase() === 'ESCALATED') continue;

                    await corrColl.updateOne({ _id: c._id }, { $set: { status: 'ESCALATED', escalatedAt: new Date() } });

                    const msg = `Correction request ${c._id} escalated automatically before payroll period ${payrollCutoffDate.toISOString()}`;
                    await this.notificationModel.create({
                        to: hrUserId,
                        type: 'CORRECTION_ESCALATED_PAYROLL',
                        message: msg,
                        metadata: { correctionRequestId: c._id?.toString(), employeeId: c.employeeId?.toString(), payrollCutoff: payrollCutoffDate.toISOString() },
                        createdAt: new Date(),
                    } as any);

                    this.logger.log(`Escalated correction request ${c._id} -> notified HR admin ${hrUserId}`);
                } catch (err) {
                    this.logger.warn('Failed to escalate correction request', c._id, err);
                }
            }

            this.logger.log(`Escalation completed: ${leaveEscalations} leave requests, ${exceptionEscalations} time exceptions`);
        } catch (error: any) {
            this.logger.error('Time request escalation failed:', error);
        }
    }

    /**
     * Get payroll cut-off date for the current month
     * Default: Last day of month, or 25th if configured earlier
     *
     * @param year Current year
     * @param month Current month (1-12)
     * @returns Payroll cut-off date
     */
    private getPayrollCutoffDate(year: number, month: number): Date {
        // Configuration: Get from environment or default to last day of month
        const cutoffDay = parseInt(process.env.PAYROLL_CUTOFF_DAY || '28', 10);

        const cutoffDate = new Date(year, month - 1, cutoffDay);
        cutoffDate.setHours(23, 59, 59, 999);

        this.logger.debug(`Payroll cut-off date calculated: ${cutoffDate.toDateString()}`);

        return cutoffDate;
    }

    /**
     * Escalate pending leave requests before payroll cut-off
     * Marks pending leave requests as escalated and notifies managers
     *
     * @param cutoffDate Payroll cut-off date
     * @returns Count of escalated leave requests
     */
    private async escalateLeaveRequests(cutoffDate: Date): Promise<number> {
        try {
            const leaveCollection = this.connection.db!.collection('leaverequests');

            // Find pending leave requests that are due for escalation
            // Escalate if:
            // 1. Status is PENDING
            // 2. Request date is before cut-off (to give time for review)
            // 3. Not already escalated
            const escalationThresholdDate = new Date(cutoffDate);
            escalationThresholdDate.setDate(escalationThresholdDate.getDate() - 5); // Escalate 5 days before cut-off

            const pendingLeaveRequests = await leaveCollection.find({
                status: 'PENDING',
                createdAt: { $lt: escalationThresholdDate },
                escalated: { $ne: true },
            }).toArray();

            this.logger.log(`Found ${pendingLeaveRequests.length} pending leave requests for escalation`);

            let escalatedCount = 0;
            const hrUserId = this.getHrUserId();

            for (const request of pendingLeaveRequests) {
                try {
                    // Update request as escalated
                    const updateResult = await leaveCollection.updateOne(
                        { _id: request._id },
                        {
                            $set: {
                                escalated: true,
                                escalationDate: new Date(),
                                escalationLevel: 'MANAGER_APPROVAL_REQUIRED',
                                urgencyFlag: true,
                            },
                        }
                    );

                    if (updateResult.modifiedCount > 0) {
                        escalatedCount++;

                        // Create escalation notification
                        await this.notificationModel.create({
                            to: hrUserId,
                            type: 'TIME_REQUEST_ESCALATION',
                            message: JSON.stringify({
                                requestType: 'LEAVE',
                                requestId: request._id.toString(),
                                employeeId: request.employeeId?.toString(),
                                leaveType: request.leaveType,
                                startDate: request.startDate,
                                endDate: request.endDate,
                                escalationReason: 'Pending review before payroll cut-off',
                                escalationDate: new Date().toISOString(),
                                payrollCutoffDate: new Date(cutoffDate).toISOString(),
                            }),
                            metadata: {
                                requestType: 'LEAVE',
                                employeeId: request.employeeId?.toString(),
                                escalationLevel: 'MANAGER_APPROVAL_REQUIRED',
                                urgency: 'HIGH',
                            },
                            createdAt: new Date(),
                        });

                        this.logger.log(`✅ Escalated leave request ${request._id} for employee ${request.employeeId}`);
                    }
                } catch (error: any) {
                    this.logger.error(`Failed to escalate leave request ${request._id}:`, error.message);
                }
            }

            this.logger.log(`Escalated ${escalatedCount} leave requests`);
            return escalatedCount;
        } catch (error: any) {
            this.logger.error('Error escalating leave requests:', error);
            return 0;
        }
    }

    /**
     * Escalate pending time exceptions before payroll cut-off
     * Marks pending exceptions as escalated and notifies managers
     *
     * @param cutoffDate Payroll cut-off date
     * @returns Count of escalated time exceptions
     */
    private async escalateTimeExceptions(cutoffDate: Date): Promise<number> {
        try {
            const exceptionCollection = this.connection.db!.collection('timeexceptions');

            // Find pending time exceptions that are due for escalation
            const escalationThresholdDate = new Date(cutoffDate);
            escalationThresholdDate.setDate(escalationThresholdDate.getDate() - 5);

            const pendingExceptions = await exceptionCollection.find({
                status: 'PENDING',
                createdAt: { $lt: escalationThresholdDate },
                escalated: { $ne: true },
            }).toArray();

            this.logger.log(`Found ${pendingExceptions.length} pending time exceptions for escalation`);

            let escalatedCount = 0;
            const hrUserId = this.getHrUserId();

            for (const exception of pendingExceptions) {
                try {
                    // Update exception as escalated
                    const updateResult = await exceptionCollection.updateOne(
                        { _id: exception._id },
                        {
                            $set: {
                                escalated: true,
                                escalationDate: new Date(),
                                escalationLevel: 'MANAGER_APPROVAL_REQUIRED',
                                urgencyFlag: true,
                            },
                        }
                    );

                    if (updateResult.modifiedCount > 0) {
                        escalatedCount++;

                        // Create escalation notification
                        await this.notificationModel.create({
                            to: hrUserId,
                            type: 'TIME_REQUEST_ESCALATION',
                            message: JSON.stringify({
                                requestType: 'TIME_EXCEPTION',
                                requestId: exception._id.toString(),
                                employeeId: exception.employeeId?.toString(),
                                exceptionType: exception.type,
                                exceptionDate: exception.date,
                                escalationReason: 'Pending review before payroll cut-off',
                                escalationDate: new Date().toISOString(),
                                payrollCutoffDate: new Date(cutoffDate).toISOString(),
                            }),
                            metadata: {
                                requestType: 'TIME_EXCEPTION',
                                employeeId: exception.employeeId?.toString(),
                                exceptionType: exception.type,
                                escalationLevel: 'MANAGER_APPROVAL_REQUIRED',
                                urgency: 'HIGH',
                            },
                            createdAt: new Date(),
                        });

                        this.logger.log(`✅ Escalated time exception ${exception._id} for employee ${exception.employeeId}`);
                    }
                } catch (error: any) {
                    this.logger.error(`Failed to escalate time exception ${exception._id}:`, error.message);
                }
            }

            this.logger.log(`Escalated ${escalatedCount} time exceptions`);
            return escalatedCount;
        } catch (error: any) {
            this.logger.error('Error escalating time exceptions:', error);
            return 0;
        }
    }

    /**
     * Apply an approved time exception (permission) to attendance records.
     *
     * Business logic and methods for applying time exceptions were not present in original file; keep original behavior unchanged.
     */
    /**
     * Watch for timeexception approvals and apply permission duration to attendance.
     * Minimal implementation: listens for updates on the "timeexceptions" collection
     * and when status becomes approved, subtracts (endTime - startTime) in minutes
     * from the attendance record's totalWorkMinutes for the affected date.
     */
    // async onModuleInit() {
    //     try {
    //         if (!this.connection || !this.connection.db) return;
    //         const coll = this.connection.db.collection('timeexceptions');
    //         if (!coll || typeof coll.watch !== 'function') return;
    //
    //         const pipeline = [ { $match: { operationType: 'update' } } ];
    //         const stream: any = coll.watch(pipeline, { fullDocument: 'updateLookup' });
    //
    //         stream.on('change', async (change: any) => {
    //             try {
    //                 const full = change.fullDocument || {};
    //                 const updated = change.updateDescription?.updatedFields || {};
    //
    //                 // Detect status becoming approved
    //                 const newStatus = updated.status ?? full.status;
    //                 const approvedValues = ['APPROVED', 'Approved', 'approved', 2, '2'];
    //                 if (!newStatus || !approvedValues.includes(newStatus)) return;
    //
    //                 // Idempotency: if already applied, skip
    //                 if (full.appliedToAttendance) return;
    //
    //                  // Need startTime and endTime to compute duration
    //                  const st = full.startTime || full.from || full.punchTime || null;
    //                  const et = full.endTime || full.to || null;
    //                  if (!st || !et) return; // nothing we can do
    //
    //                 const start = new Date(st);
    //                 const end = new Date(et);
    //                 if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    //
    //                 const minutes = Math.ceil(Math.abs(end.getTime() - start.getTime()) / 60000);
    //                 if (!minutes || minutes <= 0) return;
    //
    //                 const employeeId = full.employeeId;
    //                 if (!employeeId) return;
    //
    //                 // Find attendance record for the date(s) covered
    //                 const dayStart = new Date(start);
    //                 dayStart.setHours(0,0,0,0);
    //                 const dayEnd = new Date(start);
    //                 dayEnd.setHours(23,59,59,999);
    //
    //                 // Try to find by punches first, then by date field
    //                 let attendance: any = await this.attendanceModel.findOne({
    //                     employeeId: new Types.ObjectId(employeeId),
    //                     'punches.time': { $gte: dayStart, $lte: dayEnd }
    //                 });
    //                 if (!attendance) {
    //                     attendance = await this.attendanceModel.findOne({
    //                         employeeId: new Types.ObjectId(employeeId),
    //                         date: { $gte: dayStart, $lte: dayEnd }
    //                     });
    //                 }
    //                 if (!attendance) return;
    //
    //                 const orig = (attendance as any).totalWorkMinutes || 0;
    //                 const newTotal = Math.max(0, orig - minutes);
    //
    //                 await this.attendanceModel.updateOne({ _id: (attendance as any)._id }, {
    //                     $set: { totalWorkMinutes: newTotal, updatedAt: new Date() }
    //                 });
    //
    //                 // mark exception as applied to prevent future double application
    //                 try {
    //                     await this.exceptionModel.updateOne({ _id: full._id }, { $set: { appliedToAttendance: true, appliedAt: new Date(), appliedMinutes: minutes } });
    //                 } catch (e) { /* ignore */ }
    //             } catch (err) {
    //                 this.logger.warn('Error handling timeexception change event', err);
    //             }
    //         });
    //     } catch (err) {
    //         this.logger.debug('Timeexception watcher not started', err?.message || err);
    //     }
    // }


    /**
     * Trigger escalation for pending time requests
     * @param daysBeforePayroll - Days before payroll to send notification
     * @param hrAdminId - HR Admin user ID to send notification to
     * @param payrollRunId - Specific payroll run ID (optional)
     */
    async triggerEscalation(
        daysBeforePayroll: number,
        hrAdminId: string,
        payrollRunId?: string
    ): Promise<{ message: string; escalatedCount: number; notificationId: string }> {
        try {
            // Validate inputs
            if (daysBeforePayroll < 0 || daysBeforePayroll > 30) {
                throw new Error('daysBeforePayroll must be between 0 and 30');
            }

            if (!Types.ObjectId.isValid(hrAdminId)) {
                throw new Error('Invalid HR Admin ID');
            }

            const hrAdminObjectId = new Types.ObjectId(hrAdminId);

            // 1. Find target payroll period
            let payroll: any;

            if (payrollRunId) {
                // Use specific payroll run
                payroll = await this.payrollRunModel.findById(payrollRunId);
                if (!payroll) {
                    throw new Error(`Payroll run ${payrollRunId} not found`);
                }
            } else {
                // Find next upcoming payroll - using your ACTUAL PayRollStatus enum values
                const today = new Date();
                payroll = await this.payrollRunModel.findOne({
                    payrollPeriod: { $gte: today },
                    status: {
                        $in: [
                            PayRollStatus.DRAFT,
                            PayRollStatus.UNDER_REVIEW,
                            PayRollStatus.PENDING_FINANCE_APPROVAL
                        ]
                    }
                }).sort({ payrollPeriod: 1 }).exec();

                if (!payroll) {
                    throw new Error('No upcoming payroll periods found');
                }
            }

            // 2. Calculate escalation date
            const escalationDate = new Date(payroll.payrollPeriod);
            escalationDate.setDate(escalationDate.getDate() - daysBeforePayroll);

            // Check if we should escalate now (today >= escalationDate)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            escalationDate.setHours(0, 0, 0, 0);

            if (today.getTime() < escalationDate.getTime()) {
                throw new Error(`Escalation is scheduled for ${escalationDate.toDateString()}. Today is ${today.toDateString()}`);
            }

            // 3. Find all pending requests (SUBMITTED or PENDING)
            const pendingRequests: PendingRequest[] = [];

            // Find pending correction requests - using your actual CorrectionRequestStatus
            const correctionRequests = await this.correctionRequestModel.find({
                status: CorrectionRequestStatus.SUBMITTED
            }).lean();
            correctionRequests.forEach((request: any) => {
                pendingRequests.push({
                    type: 'CORRECTION_REQUEST',
                    id: request._id.toString(),
                    employeeId: request.employeeId.toString(),
                    createdAt: request.createdAt || new Date(),
                    status: request.status,
                    reason: request.reason || 'No reason provided'
                });
            });

            // Find pending time exceptions (including break permissions)
            // FIXED: Using timeExceptionModel instead of exceptionModel
            const timeExceptions = await this.timeExceptionModel.find({
                status: { $in: [TimeExceptionStatus.OPEN, TimeExceptionStatus.PENDING] }
            }).lean();

            timeExceptions.forEach((exception: any) => {
                const requestType = exception.type === 'SHORT_TIME' ? 'BREAK_PERMISSION' : 'TIME_EXCEPTION';
                pendingRequests.push({
                    type: requestType,
                    id: exception._id.toString(),
                    employeeId: exception.employeeId.toString(),
                    createdAt: exception.createdAt || new Date(),
                    status: exception.status,
                    reason: exception.reason || 'No reason provided'
                });
            });

            if (pendingRequests.length === 0) {
                return {
                    message: 'No pending requests found for escalation',
                    escalatedCount: 0,
                    notificationId: ''
                };
            }

            // 4. Create SINGLE notification with all request IDs
            const requestIds = pendingRequests.map((req: any) => req.id);
            const payrollDate = new Date(payroll.payrollPeriod);
            const notificationMessage = `🚨 ESCALATION: ${pendingRequests.length} pending time requests require review before payroll period ${payrollDate.toLocaleDateString()}. Request IDs: ${requestIds.join(', ')}`;

            // FIXED: Using notificationLogModel instead of notificationModel
            const notification = await this.notificationModel.create({
                to: hrAdminObjectId,
                type: 'ESCALATION_BATCH',
                message: notificationMessage,
                metadata: {
                    payrollRunId: payroll._id,
                    payrollPeriod: payroll.payrollPeriod,
                    totalRequests: pendingRequests.length,
                    requestIds: requestIds,
                    escalatedAt: new Date(),
                    daysBeforePayroll: daysBeforePayroll
                }
            });

            // 5. Mark requests as escalated (add escalation flag without changing status)
            const requestIdsObject = pendingRequests.map((req: any) => new Types.ObjectId(req.id));

            // Update correction requests
            const correctionRequestIds = requestIdsObject.filter((_: any, index: number) =>
                pendingRequests[index].type === 'CORRECTION_REQUEST'
            );

            if (correctionRequestIds.length > 0) {
                await this.correctionRequestModel.updateMany(
                    { _id: { $in: correctionRequestIds } },
                    {
                        $set: {
                            escalatedAt: new Date(),
                            escalatedTo: hrAdminObjectId,
                            escalationNote: `Escalated ${daysBeforePayroll} days before payroll period ${payrollDate.toLocaleDateString()}`
                        }
                    }
                );
            }

            // Update time exceptions
            const timeExceptionIds = requestIdsObject.filter((_: any, index: number) =>
                pendingRequests[index].type !== 'CORRECTION_REQUEST'
            );

            if (timeExceptionIds.length > 0) {
                await this.timeExceptionModel.updateMany(
                    { _id: { $in: timeExceptionIds } },
                    {
                        $set: {
                            escalatedAt: new Date(),
                            escalatedTo: hrAdminObjectId,
                            escalationNote: `Escalated ${daysBeforePayroll} days before payroll period ${payrollDate.toLocaleDateString()}`
                        }
                    }
                );
            }

            return {
                message: `✅ Escalation successful! ${pendingRequests.length} requests escalated to HR Admin. Notification sent.`,
                escalatedCount: pendingRequests.length,
                notificationId: notification._id.toString()
            };

        } catch (error: any) {
            throw new Error(`Escalation failed: ${error.message}`);
        }
    }

    /**
     * Get all requests escalated to a specific HR Admin
     * @param hrAdminId - HR Admin user ID
     */
    async getEscalatedRequests(hrAdminId: string): Promise<{
        totalCount: number;
        correctionRequests: any[];
        timeExceptions: any[];
        breakPermissions: any[];
        lastEscalation: Date | null;
    }> {
        try {
            if (!Types.ObjectId.isValid(hrAdminId)) {
                throw new Error('Invalid HR Admin ID');
            }

            const hrAdminObjectId = new Types.ObjectId(hrAdminId);

            // Get escalated correction requests
            const correctionRequests = await this.correctionRequestModel.find({
                escalatedTo: hrAdminObjectId
            })
                .select('_id employeeId status reason createdAt escalatedAt')
                .sort({ escalatedAt: -1 })
                .lean();

            // Get escalated time exceptions (excluding break permissions)
            const timeExceptions = await this.timeExceptionModel.find({
                escalatedTo: hrAdminObjectId,
                type: { $ne: 'SHORT_TIME' }
            })
                .select('_id employeeId status reason type createdAt escalatedAt')
                .sort({ escalatedAt: -1 })
                .lean();

            // Get escalated break permissions (SHORT_TIME type)
            const breakPermissions = await this.timeExceptionModel.find({
                escalatedTo: hrAdminObjectId,
                type: 'SHORT_TIME'
            })
                .select('_id employeeId status reason duration startTime endTime createdAt escalatedAt')
                .sort({ escalatedAt: -1 })
                .lean();

            // Find last escalation date
            const allRequests = [...correctionRequests, ...timeExceptions, ...breakPermissions];
            const lastEscalation = allRequests.length > 0
                ? new Date(Math.max(...allRequests.map((r: any) =>
                    new Date(r.escalatedAt || r.createdAt || 0).getTime()
                )))
                : null;

            return {
                totalCount: correctionRequests.length + timeExceptions.length + breakPermissions.length,
                correctionRequests: correctionRequests.map((req: any) => ({
                    id: req._id.toString(),
                    employeeId: req.employeeId.toString(),
                    status: req.status,
                    reason: req.reason,
                    escalatedAt: req.escalatedAt,
                    type: 'CORRECTION_REQUEST'
                })),
                timeExceptions: timeExceptions.map((req: any) => ({
                    id: req._id.toString(),
                    employeeId: req.employeeId.toString(),
                    status: req.status,
                    reason: req.reason,
                    type: req.type,
                    escalatedAt: req.escalatedAt
                })),
                breakPermissions: breakPermissions.map((req: any) => ({
                    id: req._id.toString(),
                    employeeId: req.employeeId.toString(),
                    status: req.status,
                    reason: req.reason,
                    duration: req.duration,
                    escalatedAt: req.escalatedAt,
                    type: 'BREAK_PERMISSION'
                })),
                lastEscalation
            };

        } catch (error: any) {
            throw new Error(`Failed to get escalated requests: ${error.message}`);
        }
    }


}
