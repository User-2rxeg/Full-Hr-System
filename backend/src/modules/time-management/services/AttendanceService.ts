// src/time-management/attendance/attendance.service.ts

import {
    Injectable,
    BadRequestException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model, Types} from 'mongoose';

import {
    AttendanceRecord,
    AttendanceRecordDocument,
} from '../models/attendance-record.schema';

import {
    TimeException,
    TimeExceptionDocument,
} from '../models/time-exception.schema';

import {
    AttendanceCorrectionRequest,
    AttendanceCorrectionRequestDocument,
} from '../models/attendance-correction-request.schema';

import {
    NotificationLog,
    NotificationLogDocument,
} from '../models/notification-log.schema';

import {
    ShiftAssignment,
    ShiftAssignmentDocument,
} from '../models/shift-assignment.schema';

import { Shift, ShiftDocument } from '../models/shift.schema';

import {
    LatenessRule,
    LatenessRuleDocument,
} from '../models/lateness-rule.schema';

import {
    OvertimeRule,
    OvertimeRuleDocument,
} from '../models/overtime-rule.schema';

import {
    PunchInDto,
    PunchOutDto,
} from '../dto/AttendanceDtos';

import {
    PunchType,
    TimeExceptionType,
    TimeExceptionStatus,
    ShiftAssignmentStatus,
    CorrectionRequestStatus,
} from '../models/enums';
import {HolidayService} from "./HolidayService";
import {RepeatedLatenessService} from "./RepeatedLatenessService";
import {BreakPermissionService} from "./BreakPermissionService";
import {ScheduleRule, ScheduleRuleDocument} from '../models/schedule-rule.schema';

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(
        @InjectModel(AttendanceRecord.name)
        private readonly attendanceModel: Model<AttendanceRecordDocument>,

        @InjectModel(TimeException.name)
        private readonly exceptionModel: Model<TimeExceptionDocument>,

        @InjectModel(AttendanceCorrectionRequest.name)
        private readonly correctionModel: Model<AttendanceCorrectionRequestDocument>,

        @InjectModel(NotificationLog.name)
        private readonly notificationModel: Model<NotificationLogDocument>,

        @InjectModel(ShiftAssignment.name)
        private readonly shiftAssignmentModel: Model<ShiftAssignmentDocument>,

        @InjectModel(Shift.name)
        private readonly shiftModel: Model<ShiftDocument>,

        @InjectModel(ScheduleRule.name)
        private readonly scheduleRuleModel: Model<ScheduleRuleDocument>,

        @InjectModel(LatenessRule.name)
        private readonly latenessRuleModel: Model<LatenessRuleDocument>,

        @InjectModel(OvertimeRule.name)
        private readonly overtimeRuleModel: Model<OvertimeRuleDocument>,

        private readonly holidayService: HolidayService,

        private readonly repeatedLatenessService: RepeatedLatenessService,

        private readonly breakPermissionService?: BreakPermissionService,
    ) {}

    // ============================================================
    // UTILITIES
    // ============================================================

    /**
     * Parse date string in format dd/mm/yyyy hh:mm
     */
    private parseCustomDateFormat(dateStr: string | Date | undefined): Date | null {
        if (!dateStr) return null;

        // If already a Date object, return it
        if (dateStr instanceof Date) return dateStr;

        // Try parsing custom format: dd/mm/yyyy hh:mm
        const customFormatRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;
        const match = dateStr.match(customFormatRegex);

        if (match) {
            const [, day, month, year, hours, minutes] = match;
            const date = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hours),
                parseInt(minutes)
            );

            // Validate the date is valid
            if (!isNaN(date.getTime())) {
                return date;
            }
        }

        // Fallback: try parsing as ISO string or standard format
        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date;
            }
        } catch (e) {
            // Invalid date
        }

        return null;
    }

    private getRecordDate(att: AttendanceRecord): Date {
        if (att.punches?.length > 0) {
            const sorted = att.punches
                .slice()
                .sort((a, b) => +new Date(a.time) - +new Date(b.time));
            return new Date(sorted[0].time);
        }
        try {
            const ts = (att as any)._id?.getTimestamp?.();
            if (ts) return ts;
        } catch {}
        return new Date();
    }

    private async resolveAssigneeForEmployee(id: string | Types.ObjectId) {
        const sys = process.env.SYSTEM_USER_ID;
        if (sys) return new Types.ObjectId(sys);
        return typeof id === 'string' ? new Types.ObjectId(id) : id;
    }

    private async createTimeExceptionAuto(params: {
        employeeId: string | Types.ObjectId;
        attendanceRecordId: Types.ObjectId | null;
        type: TimeExceptionType;
        reason?: string;
    }) {
        const assignedTo = await this.resolveAssigneeForEmployee(params.employeeId);

        const ex = await this.exceptionModel.create({
            employeeId:
                typeof params.employeeId === 'string'
                    ? new Types.ObjectId(params.employeeId)
                    : params.employeeId,
            attendanceRecordId: params.attendanceRecordId ?? undefined,
            type: params.type,
            assignedTo,
            status: TimeExceptionStatus.OPEN,
            reason: params.reason || 'Auto-created',
        } as Partial<TimeException>);

        // If this exception references an attendance record, attach the exception id to that record
        try {
            if (params.attendanceRecordId) {
                const att = await this.attendanceModel.findById(params.attendanceRecordId);
                if (att) {
                    att.exceptionIds = att.exceptionIds || [];
                    // avoid duplicates
                    const exists = att.exceptionIds.some(id => id?.toString?.() === (ex._id as any).toString());
                    if (!exists) att.exceptionIds.push(ex._id as any);
                    att.finalisedForPayroll = false;
                    await att.save();
                }
            }
        } catch (e) {
            this.logger.warn('Failed to attach exception to attendance record', e);
        }

        return ex.toObject() as TimeException;
    }

    /**
     * Validate if punch time is within assigned shift time range
     */
    private async validatePunchAgainstShift(
        employeeId: string | Types.ObjectId,
        punchTime: Date
    ): Promise<{
        isValid: boolean;
        error?: string;
        shift?: Shift;
        assignment?: ShiftAssignment;
        isRestDay?: boolean;
        debugInfo?: any;
    }> {
        let empOid: Types.ObjectId;
        try {
            empOid = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;
        } catch (e) {
            this.logger.error(`[DEBUG] Invalid employeeId format: ${employeeId}`);
            return {
                isValid: false,
                error: `Invalid employee ID format: ${employeeId}`,
                debugInfo: { invalidObjectId: true }
            };
        }

        this.logger.debug(`[DEBUG] validatePunchAgainstShift called for employee ${empOid} at ${punchTime.toISOString()}`);

        // Check holiday first with detailed logging
        let isHoliday = false;
        let holidayError = null;
        try {
            this.logger.debug(`[DEBUG] Calling holidayService.isHoliday for date: ${punchTime.toDateString()}`);
            if (typeof this.holidayService.isHoliday === 'function') {
                isHoliday = await this.holidayService.isHoliday(punchTime);
                this.logger.debug(`[DEBUG] Holiday check result: ${isHoliday}`);
            } else {
                this.logger.warn(`[DEBUG] holidayService.isHoliday is not a function`);
            }
        } catch (e) {
            holidayError = e.message || 'Unknown error';
            this.logger.error(`[DEBUG] HolidayService.isHoliday failed:`, e);
            // Continue with validation even if holiday check fails
        }

        if (isHoliday) {
            this.logger.warn(`[DEBUG] Punch blocked: Date ${punchTime.toDateString()} is marked as holiday`);
            return {
                isValid: false,
                error: `Cannot punch on a holiday (${punchTime.toDateString()}). Please contact HR if you need an exception.`,
                isRestDay: true,
                debugInfo: { holidayCheck: true, holidayError }
            };
        }

        // Get the day boundaries for the punch time
        const dayStart = new Date(punchTime);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(punchTime);
        dayEnd.setHours(23, 59, 59, 999);

        this.logger.debug(`[DEBUG] Looking for shift assignments between ${dayStart.toISOString()} and ${dayEnd.toISOString()}`);

        // Find active shift assignment for this employee
        // Note: status may be stored as lowercase or uppercase depending on how it was created
        const assignment = await this.shiftAssignmentModel.findOne({
            employeeId: empOid,
            $or: [
                {
                    startDate: { $lte: punchTime },
                    $or: [
                        { endDate: { $exists: false } },
                        { endDate: null },
                        { endDate: { $gte: punchTime } }
                    ]
                },
                {
                    startDate: { $lte: dayEnd },
                    $or: [
                        { endDate: { $exists: false } },
                        { endDate: null },
                        { endDate: { $gte: dayStart } }
                    ]
                }
            ],
            status: {
                $in: [
                    ShiftAssignmentStatus.APPROVED,
                    'approved'
                ]
            }
        }).lean();

        this.logger.debug(`[DEBUG] Shift assignment found: ${assignment ? 'YES' : 'NO'}`);
        if (assignment) {
            this.logger.debug(`[DEBUG] Assignment details: ${JSON.stringify({
                _id: assignment._id,
                shiftId: assignment.shiftId,
                scheduleRuleId: assignment.scheduleRuleId,
                startDate: assignment.startDate,
                endDate: assignment.endDate,
                status: assignment.status
            })}`);
        }

        // If no assignment found, block punch and provide clear error message
        if (!assignment) {
            // Check for non-APPROVED assignments to provide specific error messages
            const nonApprovedAssignment = await this.shiftAssignmentModel.findOne({
                employeeId: empOid,
                $or: [
                    {
                        startDate: { $lte: punchTime },
                        $or: [
                            { endDate: { $exists: false } },
                            { endDate: null },
                            { endDate: { $gte: punchTime } }
                        ]
                    },
                    {
                        startDate: { $lte: dayEnd },
                        $or: [
                            { endDate: { $exists: false } },
                            { endDate: null },
                            { endDate: { $gte: dayStart } }
                        ]
                    }
                ],
                status: {
                    $in: [
                        ShiftAssignmentStatus.PENDING,
                        ShiftAssignmentStatus.CANCELLED,
                        ShiftAssignmentStatus.EXPIRED,
                        'pending',
                        'cancelled',
                        'expired'
                    ]
                }
            }).lean();

            if (nonApprovedAssignment) {
                const statusUpper = String(nonApprovedAssignment.status).toUpperCase();

                if (statusUpper === 'PENDING') {
                    this.logger.warn(`[DEBUG] Shift assignment exists for employee ${empOid} but is PENDING - blocking punch`);
                    return {
                        isValid: false,
                        error: 'Your shift assignment is pending approval. Please wait for HR to approve your shift assignment before punching in.',
                        isRestDay: false,
                        debugInfo: { status: 'PENDING' }
                    };
                } else if (statusUpper === 'CANCELLED') {
                    this.logger.warn(`[DEBUG] Shift assignment exists for employee ${empOid} but is CANCELLED - blocking punch`);
                    return {
                        isValid: false,
                        error: 'Your shift assignment has been cancelled. Please contact HR to request a new shift assignment.',
                        isRestDay: false,
                        debugInfo: { status: 'CANCELLED' }
                    };
                } else if (statusUpper === 'EXPIRED') {
                    this.logger.warn(`[DEBUG] Shift assignment exists for employee ${empOid} but is EXPIRED - blocking punch`);
                    return {
                        isValid: false,
                        error: 'Your shift assignment has expired. Please contact HR to renew or request a new shift assignment.',
                        isRestDay: false,
                        debugInfo: { status: 'EXPIRED' }
                    };
                }
            }

            this.logger.warn(`[DEBUG] No active shift assignment found for employee ${empOid} on ${dayStart.toISOString()} - blocking punch`);
            return {
                isValid: false,
                error: 'No active shift assignment found. Please contact HR to assign you a shift before punching in.',
                isRestDay: false,
                debugInfo: { noAssignment: true }
            };
        }

        // Get the shift details
        const shift = await this.shiftModel.findById(assignment.shiftId).lean();

        if (!shift) {
            this.logger.error(`[DEBUG] Shift not found for assignment ${assignment._id}, shiftId: ${assignment.shiftId}`);
            return {
                isValid: false,
                error: 'Shift configuration not found. Your shift assignment references a shift that no longer exists. Please contact HR.',
                assignment: assignment as any,
                debugInfo: { shiftNotFound: true }
            };
        }

        // Validate that shift has required time fields
        if (!shift.startTime || !shift.endTime) {
            this.logger.error(`[DEBUG] Shift ${shift.name} is missing startTime or endTime`);
            return {
                isValid: false,
                error: `Shift "${shift.name}" is not properly configured (missing start/end times). Please contact HR.`,
                shift: shift as any,
                assignment: assignment as any,
                debugInfo: { missingShiftTimes: true, startTime: shift.startTime, endTime: shift.endTime }
            };
        }

        this.logger.debug(`[DEBUG] Shift details: ${JSON.stringify({
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            graceInMinutes: shift.graceInMinutes,
            graceOutMinutes: shift.graceOutMinutes,
            punchPolicy: (shift as any).punchPolicy
        })}`);

        // If assignment has a scheduleRuleId, check if the requested punch day is included
        if (assignment.scheduleRuleId) {
            try {
                const rule = await this.scheduleRuleModel.findById(assignment.scheduleRuleId).lean();
                if (rule) {
                    this.logger.debug(`[DEBUG] Schedule rule found: ${JSON.stringify({
                        name: rule.name,
                        pattern: rule.pattern,
                        active: rule.active
                    })}`);

                    if (rule.active && rule.pattern) {
                        const pattern = (rule.pattern || '').toUpperCase();
                        this.logger.debug(`[DEBUG] Checking pattern: ${pattern}`);

                        if (pattern.startsWith('WEEKLY:')) {
                            const daysPart = pattern.split(':')[1] || '';
                            this.logger.debug(`[DEBUG] Weekly pattern days part: "${daysPart}"`);

                            // More flexible parsing of days
                            const allowedDays = daysPart.split(',')
                                .map(d => d.trim().toUpperCase())
                                .filter(d => d.length > 0)
                                .map(d => {
                                    // Take first 3 letters for day matching
                                    if (d.length >= 3) return d.substring(0, 3);
                                    return d;
                                });

                            this.logger.debug(`[DEBUG] Parsed allowed days: ${JSON.stringify(allowedDays)}`);

                            // Day names for getDay() - 0=Sunday, 1=Monday, etc.
                            const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                            const dayIndex = punchTime.getDay();
                            const today = dayNames[dayIndex];

                            this.logger.debug(`[DEBUG] Today is ${today} (dayIndex: ${dayIndex})`);

                            if (allowedDays.length > 0 && !allowedDays.includes(today)) {
                                this.logger.warn(`[DEBUG] Day ${today} not in allowed days: ${allowedDays.join(', ')}`);
                                return {
                                    isValid: false,
                                    error: `You are not scheduled to work on ${today} according to your shift schedule (${rule.name}). Allowed days: ${allowedDays.join(', ')}. Please contact your manager to request an exception.`,
                                    isRestDay: true,
                                    debugInfo: {
                                        today,
                                        allowedDays,
                                        pattern,
                                        dayIndex
                                    }
                                };
                            }
                        } else if (pattern === 'DAILY' || pattern.startsWith('DAILY')) {
                            this.logger.debug(`[DEBUG] Daily schedule - allowed`);
                        } else {
                            this.logger.debug(`[DEBUG] Unknown schedule rule pattern '${rule.pattern}' - allowing punch by default`);
                        }
                    } else if (!rule.active) {
                        this.logger.debug(`[DEBUG] Schedule rule ${rule._id} is not active`);
                    }
                } else {
                    this.logger.debug(`[DEBUG] Schedule rule ${assignment.scheduleRuleId} not found`);
                }
            } catch (e) {
                this.logger.error('[DEBUG] ScheduleRule lookup failed during punch validation', e);
                // Allow punch if schedule rule lookup fails
            }
        } else {
            this.logger.debug(`[DEBUG] No scheduleRuleId on assignment`);
        }

        // Parse shift times (format: "HH:mm")
        let shiftStartHour: number, shiftStartMin: number, shiftEndHour: number, shiftEndMin: number;
        try {
            const startParts = shift.startTime.split(':');
            const endParts = shift.endTime.split(':');
            shiftStartHour = Number(startParts[0]);
            shiftStartMin = Number(startParts[1] || 0);
            shiftEndHour = Number(endParts[0]);
            shiftEndMin = Number(endParts[1] || 0);

            if (isNaN(shiftStartHour) || isNaN(shiftEndHour)) {
                throw new Error('Invalid time format');
            }
        } catch (e) {
            this.logger.error(`[DEBUG] Failed to parse shift times: startTime=${shift.startTime}, endTime=${shift.endTime}`, e);
            return {
                isValid: false,
                error: `Shift "${shift.name}" has invalid time configuration. Please contact HR.`,
                shift: shift as any,
                assignment: assignment as any,
                debugInfo: { parseError: true, startTime: shift.startTime, endTime: shift.endTime }
            };
        }

        // Helper to build effective start/end for a given anchor date (the day to which startTime/endTime are applied)
        const buildEffectiveWindow = (anchorDate: Date) => {
            const s = new Date(anchorDate);
            s.setHours(shiftStartHour, shiftStartMin, 0, 0);
            const e = new Date(anchorDate);
            e.setHours(shiftEndHour, shiftEndMin, 0, 0);

            // If shift ends <= starts, it means it goes to next day
            if (e.getTime() <= s.getTime()) {
                e.setDate(e.getDate() + 1);
            }

            const graceInMs = (shift.graceInMinutes || 0) * 60 * 1000;
            const graceOutMs = (shift.graceOutMinutes || 0) * 60 * 1000;

            const effectiveStart = new Date(s.getTime() - graceInMs);
            const effectiveEnd = new Date(e.getTime() + graceOutMs);

            return { effectiveStart, effectiveEnd, s, e };
        };

        // Build two candidate windows:
        // 1) anchor on the punch date (assumes shift starts same calendar day)
        // 2) anchor on previous day (covers shifts that started the previous day and end after midnight)
        const anchorToday = new Date(punchTime);
        anchorToday.setHours(0,0,0,0);
        const anchorPrev = new Date(anchorToday);
        anchorPrev.setDate(anchorPrev.getDate() - 1);

        const windowToday = buildEffectiveWindow(anchorToday);
        const windowPrev = buildEffectiveWindow(anchorPrev);

        const formatTime = (date: Date) => {
            const h = String(date.getHours()).padStart(2, '0');
            const m = String(date.getMinutes()).padStart(2, '0');
            return `${h}:${m}`;
        };

        // Check if punchTime falls into either effective window
        const inTodayWindow = punchTime >= windowToday.effectiveStart && punchTime <= windowToday.effectiveEnd;
        const inPrevWindow = punchTime >= windowPrev.effectiveStart && punchTime <= windowPrev.effectiveEnd;

        if (!inTodayWindow && !inPrevWindow) {
            this.logger.debug(`[DEBUG] Punch time outside both candidate shift ranges`);
            this.logger.debug(`[DEBUG] Punch time: ${formatTime(punchTime)}`);
            this.logger.debug(`[DEBUG] Window (today anchor): ${formatTime(windowToday.effectiveStart)} - ${formatTime(windowToday.effectiveEnd)}`);
            this.logger.debug(`[DEBUG] Window (prev anchor): ${formatTime(windowPrev.effectiveStart)} - ${formatTime(windowPrev.effectiveEnd)}`);

            return {
                isValid: false,
                error: `Punch time ${formatTime(punchTime)} is outside your assigned shift hours (${shift.startTime} - ${shift.endTime}${(shift.graceInMinutes || 0) > 0 || (shift.graceOutMinutes || 0) > 0 ? ' with grace periods' : ''}). Valid ranges: ${formatTime(windowPrev.effectiveStart)} - ${formatTime(windowPrev.effectiveEnd)} or ${formatTime(windowToday.effectiveStart)} - ${formatTime(windowToday.effectiveEnd)}.`,
                shift: shift as any,
                assignment: assignment as any,
                isRestDay: false,
                debugInfo: {
                    windowToday: { start: windowToday.effectiveStart, end: windowToday.effectiveEnd },
                    windowPrev: { start: windowPrev.effectiveStart, end: windowPrev.effectiveEnd }
                }
            };
        }

        // If within a window, return success and indicate which window matched
        const matchedWindow = inPrevWindow ? 'PREVIOUS_DAY' : 'SAME_DAY';

        this.logger.debug(`[DEBUG] Punch validated successfully for shift ${shift.name} (matched window: ${matchedWindow})`);
        return {
            isValid: true,
            shift: shift as any,
            assignment: assignment as any,
            isRestDay: false,
            debugInfo: {
                matchedWindow,
                windowToday: { start: windowToday.effectiveStart, end: windowToday.effectiveEnd },
                windowPrev: { start: windowPrev.effectiveStart, end: windowPrev.effectiveEnd }
            }
        };
    }

    // private async findOrCreateRecord(employeeId: string, date: Date) {
    //     // canonical day-range for the provided date
    //     const start = new Date(date);
    //     start.setHours(0, 0, 0, 0);
    //     const end = new Date(date);
    //     end.setHours(23, 59, 59, 999);
    //
    //     const empOid = new Types.ObjectId(employeeId);
    //
    //     this.logger.debug(`findOrCreateRecord: looking for record on ${start.toISOString()} to ${end.toISOString()}`);
    //
    //     // 1) Find ALL records for this employee that have at least one punch in the target day
    //     const candidates = await this.attendanceModel.find({
    //         employeeId: empOid,
    //         'punches.time': { $gte: start, $lte: end },
    //     });
    //
    //     this.logger.debug(`findOrCreateRecord: found ${candidates.length} candidate record(s) with punches in date range`);
    //
    //     // 2) Check each candidate to ensure ALL punches are within the target day
    //     for (const candidate of candidates) {
    //         if (!candidate.punches || candidate.punches.length === 0) {
    //             // Empty record - can use it
    //             this.logger.debug(`findOrCreateRecord: using empty record ${candidate._id}`);
    //             return candidate;
    //         }
    //
    //         // Verify that ALL punches are within the target day
    //         const allPunchesInDay = candidate.punches.every(p => {
    //             const punchTime = new Date(p.time);
    //             const isInRange = punchTime >= start && punchTime <= end;
    //             if (!isInRange) {
    //                 this.logger.debug(`findOrCreateRecord: record ${candidate._id} has punch outside range: ${punchTime.toISOString()}`);
    //             }
    //             return isInRange;
    //         });
    //
    //         if (allPunchesInDay) {
    //             this.logger.debug(`findOrCreateRecord: matched record ${candidate._id} - all ${candidate.punches.length} punches are within target day`);
    //             return candidate;
    //         } else {
    //             this.logger.warn(`findOrCreateRecord: record ${candidate._id} spans multiple days - this should not happen! Skipping it.`);
    //         }
    //     }
    //
    //     // 3) Try to find an empty record created on this day
    //     const emptyRecords = await this.attendanceModel.find({
    //         employeeId: empOid,
    //         $or: [
    //             { punches: { $exists: false } },
    //             { punches: { $size: 0 } }
    //         ],
    //         createdAt: { $gte: start, $lte: end } as any,
    //     });
    //
    //     if (emptyRecords.length > 0) {
    //         this.logger.debug(`findOrCreateRecord: found empty record by createdAt ${emptyRecords[0]._id}`);
    //         return emptyRecords[0];
    //     }
    //
    //     // 4) Nothing found: create a fresh attendance record for that employee/day
    //     const doc = new this.attendanceModel({
    //         employeeId: empOid,
    //         punches: [],
    //         totalWorkMinutes: 0,
    //         hasMissedPunch: false,
    //         exceptionIds: [],
    //         finalisedForPayroll: true,
    //     });
    //
    //     const saved = await doc.save();
    //     this.logger.debug(`findOrCreateRecord: created new attendance record for ${employeeId} on ${start.toISOString()} -> ${saved._id}`);
    //     return saved;
    // }
    private async findOrCreateRecord(employeeId: string, date: Date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);

        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        let empOid: Types.ObjectId;
        try {
            empOid = new Types.ObjectId(employeeId);
        } catch (e) {
            this.logger.error(`[findOrCreateRecord] Invalid employeeId format: ${employeeId}`);
            throw new BadRequestException(`Invalid employee ID format: ${employeeId}`);
        }

        this.logger.debug(`[findOrCreateRecord] Looking for record for employee ${employeeId} on ${start.toISOString()} to ${end.toISOString()}`);

        // Step 1: Try to find an existing record with punches in the date range
        const existingWithPunches = await this.attendanceModel.findOne({
            employeeId: empOid,
            'punches.time': { $gte: start, $lte: end },
        });

        if (existingWithPunches) {
            this.logger.debug(`[findOrCreateRecord] Found existing record with punches: ${existingWithPunches._id}`);
            return existingWithPunches;
        }

        // Step 2: Try to find an empty record for this employee (no punches yet)
        const existingEmpty = await this.attendanceModel.findOne({
            employeeId: empOid,
            $or: [
                { punches: { $exists: false } },
                { punches: { $size: 0 } },
            ],
        });

        if (existingEmpty) {
            this.logger.debug(`[findOrCreateRecord] Found existing empty record: ${existingEmpty._id}`);
            return existingEmpty;
        }

        // Step 3: No record found - create a new one
        this.logger.debug(`[findOrCreateRecord] No existing record found, creating new one for employee ${employeeId}`);

        const newRecord = new this.attendanceModel({
            employeeId: empOid,
            punches: [],
            totalWorkMinutes: 0,
            hasMissedPunch: false,
            exceptionIds: [],
            finalisedForPayroll: false,
        });

        const saved = await newRecord.save();
        this.logger.debug(`[findOrCreateRecord] Created new record: ${saved._id}`);
        return saved;
    }
    // ============================================================
    // PUNCH LOGIC
    // ============================================================

    async punchIn(dto: PunchInDto) {
        if (!dto.employeeId) throw new BadRequestException('employeeId required');

        this.logger.log(`[PUNCH-IN START] Employee: ${dto.employeeId}`);

        try {
            // 1) canonicalize timestamp - parse custom format if provided
            let now: Date;
            if (dto.time) {
                const parsed = this.parseCustomDateFormat(dto.time as any);
                if (!parsed) {
                    throw new BadRequestException('Invalid time format. Expected format: dd/mm/yyyy hh:mm (e.g., 01/12/2025 14:30)');
                }
                now = parsed;
            } else {
                now = new Date();
            }

            this.logger.debug(`[PUNCH-IN] Punch time: ${now.toISOString()} (${now.toString()})`);

            // 1.5) VALIDATE PUNCH AGAINST SHIFT TIME RANGE
            const validation = await this.validatePunchAgainstShift(dto.employeeId, now);
            if (!validation.isValid) {
                this.logger.error(`[PUNCH-IN DENIED] for employee ${dto.employeeId}: ${validation.error}`);
                this.logger.debug(`[PUNCH-IN DEBUG] Validation details: ${JSON.stringify(validation.debugInfo)}`);
                throw new BadRequestException(validation.error);
            }

        this.logger.debug(`[PUNCH-IN VALIDATED] for employee ${dto.employeeId} at ${now.toISOString()} - Shift: ${validation.shift?.name}`);

        // 2) find or create the attendance record for this employee/day
        const rec = await this.findOrCreateRecord(dto.employeeId, now);
        if (!rec) {
            throw new NotFoundException('Unable to create or find attendance record');
        }

        // 3) load authoritative doc
        const attendance = await this.attendanceModel.findById(rec._id);
        if (!attendance) {
            throw new NotFoundException('Attendance record not found after creation');
        }

        this.logger.debug(`[PUNCH-IN] Using attendance record ${attendance._id} for employee ${String(attendance.employeeId)}`);

        // 4) Validate that the punch time is on the same calendar day as existing punches
        if (attendance.punches && attendance.punches.length > 0) {
            const firstPunchDate = new Date(attendance.punches[0].time);
            const firstPunchDayStart = new Date(firstPunchDate);
            firstPunchDayStart.setHours(0, 0, 0, 0);
            const firstPunchDayEnd = new Date(firstPunchDate);
            firstPunchDayEnd.setHours(23, 59, 59, 999);

            if (now < firstPunchDayStart || now > firstPunchDayEnd) {
                this.logger.error(`[PUNCH-IN ERROR] Attempted to add punch on different day! Record ${attendance._id} has punches from ${firstPunchDate.toISOString()}, but trying to add punch at ${now.toISOString()}`);
                throw new BadRequestException('Cannot add punch to a different day. Please contact support if you see this error.');
            }
        }

        // 5) prepare punches list & lastPunch
        const punches = (attendance.punches || []).slice().sort((a, b) => +new Date(a.time) - +new Date(b.time));
        const lastPunch = punches.length ? punches[punches.length - 1] : null;

        // 6) Chronological validation — only compare to lastPunch if it's on the same calendar day as 'now'
        if (lastPunch) {
            try {
                const lastPunchTime = new Date(lastPunch.time);
                if (!isNaN(lastPunchTime.getTime())) {
                    const lastDay = lastPunchTime.toISOString().split('T')[0];
                    const nowDay = new Date(now).toISOString().split('T')[0];
                    if (lastDay === nowDay && now.getTime() < lastPunchTime.getTime()) {
                        throw new BadRequestException('Punch time cannot be earlier than last recorded punch');
                    }
                }
            } catch (e) {
                // If parsing fails, be conservative and skip chronological check rather than blocking the punch
                this.logger.warn('Skipping chronological validation due to parse error for lastPunch', e);
            }
        }

        // 7) Prevent duplicate exact timestamp IN
        if (punches.some(p => +new Date(p.time) === +now.getTime() && p.type === PunchType.IN)) {
            throw new BadRequestException('Duplicate IN punch at same timestamp');
        }

        // 7.5) NATURAL SEQUENCE VALIDATION
        if (lastPunch && lastPunch.type === PunchType.IN) {
            throw new BadRequestException('Cannot punch IN again. You must punch OUT first before punching IN again.');
        }

        // 8) Determine punch policy
        let punchPolicy: string | null = null;
        try {
            const recDate = new Date(now);
            const start = new Date(recDate); start.setHours(0, 0, 0, 0);
            const end = new Date(recDate); end.setHours(23, 59, 59, 999);

            const assignment = await this.shiftAssignmentModel.findOne({
                employeeId: attendance.employeeId,
                startDate: { $lte: end },
                $or: [{ endDate: { $exists: false } }, { endDate: { $gte: start } }],
            });

            if (assignment) {
                const shift = await this.shiftModel.findById(assignment.shiftId);
                if (shift && (shift as any).punchPolicy) {
                    punchPolicy = (shift as any).punchPolicy;
                    this.logger.debug(`[PUNCH-IN] Found punch policy: ${punchPolicy}`);
                }
            }
        } catch (e) {
            this.logger.debug('Failed to determine punch policy for punchIn; defaulting to FIRST_LAST', e);
        }
        if (!punchPolicy) punchPolicy = 'FIRST_LAST';

        // 9) Enforce policy rules for IN based on punch policy
        let shouldRecordPunch = true;
        if (punchPolicy === 'FIRST_LAST') {
            const inCount = punches.filter(p => p.type === PunchType.IN).length;
            if (inCount >= 1) {
                shouldRecordPunch = false;
                this.logger.log(`[PUNCH-IN POLICY] FIRST_LAST policy: Punch IN acknowledged but not recorded for employee ${dto.employeeId} - first IN already exists`);
                const currentRecord = await this.attendanceModel.findById(attendance._id);
                return currentRecord!.toObject();
            }
            this.logger.debug(`[PUNCH-IN POLICY] FIRST_LAST policy: Recording first punch IN for employee ${dto.employeeId}`);
        } else if (punchPolicy === 'MULTIPLE') {
            this.logger.debug(`[PUNCH-IN POLICY] MULTIPLE policy: Accepting punch IN for employee ${dto.employeeId}`);
        }

        // 10) Append IN punch
        if (shouldRecordPunch) {
            const updateResult = await this.attendanceModel.updateOne(
                { _id: attendance._id },
                { $push: { punches: { type: PunchType.IN, time: new Date(now) } } },
            );

            this.logger.log(`[PUNCH-IN SUCCESS] Punch IN recorded: Employee ${dto.employeeId}, Time: ${now.toISOString()}, Policy: ${punchPolicy}`);
            this.logger.debug(`[PUNCH-IN] Update result: matchedCount=${updateResult.matchedCount}, modifiedCount=${updateResult.modifiedCount}`);

            // Verify the punch was actually saved
            const verifyRecord = await this.attendanceModel.findById(attendance._id).lean();
            if (verifyRecord) {
                this.logger.debug(`[PUNCH-IN VERIFY] Record ${attendance._id} now has ${verifyRecord.punches?.length || 0} punches`);
            } else {
                this.logger.error(`[PUNCH-IN VERIFY] Record ${attendance._id} not found after update!`);
            }

            // 11) Recompute totals / exceptions
            await this.recompute(attendance._id);
        }

        const finalRecord = await this.attendanceModel.findById(attendance._id);
        if (!finalRecord) {
            this.logger.error(`[PUNCH-IN] Final record not found for ${attendance._id}`);
            throw new NotFoundException('Attendance record not found after punch');
        }

        this.logger.debug(`[PUNCH-IN] Returning record with ${finalRecord.punches?.length || 0} punches`);
        return finalRecord.toObject();
        } catch (error) {
            // Re-throw BadRequestException and NotFoundException as-is
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            // Log and wrap unexpected errors
            this.logger.error(`[PUNCH-IN ERROR] Unexpected error for employee ${dto.employeeId}: ${error.message}`, error.stack);
            throw new BadRequestException(`Failed to punch in: ${error.message || 'Unknown error occurred'}`);
        }
    }

    async punchOut(dto: PunchOutDto) {
        if (!dto.employeeId) throw new BadRequestException('employeeId required');

        this.logger.log(`[PUNCH-OUT START] Employee: ${dto.employeeId}`);

        // 1) canonicalize timestamp
        let now: Date;
        if (dto.time) {
            const parsed = this.parseCustomDateFormat(dto.time as any);
            if (!parsed) {
                throw new BadRequestException('Invalid time format. Expected format: dd/mm/yyyy hh:mm (e.g., 01/12/2025 18:30)');
            }
            now = parsed;
        } else {
            now = new Date();
        }

        this.logger.debug(`[PUNCH-OUT] Punch time: ${now.toISOString()} (${now.toString()})`);

        // 1.5) VALIDATE PUNCH AGAINST SHIFT TIME RANGE
        const validation = await this.validatePunchAgainstShift(dto.employeeId, now);
        if (!validation.isValid) {
            this.logger.error(`[PUNCH-OUT DENIED] for employee ${dto.employeeId}: ${validation.error}`);
            this.logger.debug(`[PUNCH-OUT DEBUG] Validation details: ${JSON.stringify(validation.debugInfo)}`);
            throw new BadRequestException(validation.error);
        }

        this.logger.debug(`[PUNCH-OUT VALIDATED] for employee ${dto.employeeId} at ${now.toISOString()} - Shift: ${validation.shift?.name}`);

        // 2) find or create the attendance record
        // If validatePunchAgainstShift indicated the punch belongs to the PREVIOUS_DAY window
        // (overnight shift), attach the punch to the previous day's attendance record.
        let recordDateForFind = new Date(now);
        try {
            if (validation.debugInfo && validation.debugInfo.matchedWindow === 'PREVIOUS_DAY') {
                recordDateForFind.setDate(recordDateForFind.getDate() - 1);
                this.logger.debug(`[PUNCH-OUT] Attaching OUT to previous day's attendance record: ${recordDateForFind.toISOString()}`);
            }
        } catch (e) {
            this.logger.debug('Failed to interpret validation.debugInfo.matchedWindow; defaulting to punch date', e);
        }
        const rec = await this.findOrCreateRecord(dto.employeeId, recordDateForFind);
        if (!rec) {
            throw new NotFoundException('Unable to create or find attendance record');
        }

        // 3) load authoritative doc
        const attendance = await this.attendanceModel.findById(rec._id);
        if (!attendance) throw new NotFoundException('Attendance record not found');

        this.logger.debug(`[PUNCH-OUT] Using attendance record ${attendance._id} for employee ${String(attendance.employeeId)}`);

        // 4) Validate punch is on same calendar day
        if (attendance.punches && attendance.punches.length > 0) {
            const firstPunchDate = new Date(attendance.punches[0].time);
            const firstPunchDayStart = new Date(firstPunchDate);
            firstPunchDayStart.setHours(0, 0, 0, 0);
            const firstPunchDayEnd = new Date(firstPunchDate);
            firstPunchDayEnd.setHours(23, 59, 59, 999);

            // If validation indicated this punch matched the previous-day overnight window,
            // allow the OUT even if it falls outside the attendance record's calendar day as long as
            // it is within the effective end of the previous window (e.g., shift end + grace).
            const matchedPrevWindowEnd = validation?.debugInfo?.windowPrev?.end ? new Date(validation.debugInfo.windowPrev.end) : null;

            if (validation?.debugInfo?.matchedWindow === 'PREVIOUS_DAY' && matchedPrevWindowEnd) {
                if (now > matchedPrevWindowEnd) {
                    this.logger.error(`[PUNCH-OUT ERROR] Attempted to add punch outside previous-day effective window! Record ${attendance._id} has punches from ${firstPunchDate.toISOString()}, trying to add punch at ${now.toISOString()}, allowed until ${matchedPrevWindowEnd.toISOString()}`);
                    throw new BadRequestException('Cannot add punch outside the allowed shift window. Please contact support.');
                }
            } else {
                if (now < firstPunchDayStart || now > firstPunchDayEnd) {
                    this.logger.error(`[PUNCH-OUT ERROR] Attempted to add punch on different day! Record ${attendance._id} has punches from ${firstPunchDate.toISOString()}, but trying to add punch at ${now.toISOString()}`);
                    throw new BadRequestException('Cannot add punch to a different day. Please contact support if you see this error.');
                }
            }
        }

        // 5) prepare punches list & lastPunch
        const punches = (attendance.punches || []).slice().sort((a, b) => +new Date(a.time) - +new Date(b.time));
        const lastPunch = punches.length ? punches[punches.length - 1] : null;

        // 6) Chronological validation — only compare to lastPunch if it's on the same calendar day as 'now'
        if (lastPunch) {
            try {
                const lastPunchTime = new Date(lastPunch.time);
                if (!isNaN(lastPunchTime.getTime())) {
                    const lastDay = lastPunchTime.toISOString().split('T')[0];
                    const nowDay = new Date(now).toISOString().split('T')[0];
                    if (lastDay === nowDay && now.getTime() < lastPunchTime.getTime()) {
                        throw new BadRequestException('Punch time cannot be earlier than last recorded punch');
                    }
                }
            } catch (e) {
                // If parsing fails, be conservative and skip chronological check rather than blocking the punch
                this.logger.warn('Skipping chronological validation due to parse error for lastPunch', e);
            }
        }

        // 7) Prevent duplicate exact timestamp OUT
        if (punches.some(p => +new Date(p.time) === +now.getTime() && p.type === PunchType.OUT)) {
            throw new BadRequestException('Duplicate OUT punch at same timestamp');
        }

        // 8) Determine punch policy
        let punchPolicy: string | null = null;
        try {
            const recDate = new Date(now);
            const start = new Date(recDate); start.setHours(0, 0, 0, 0);
            const end = new Date(recDate); end.setHours(23, 59, 59, 999);

            const assignment = await this.shiftAssignmentModel.findOne({
                employeeId: attendance.employeeId,
                startDate: { $lte: end },
                $or: [{ endDate: { $exists: false } }, { endDate: { $gte: start } }],
            });

            if (assignment) {
                const shift = await this.shiftModel.findById(assignment.shiftId);
                if (shift && (shift as any).punchPolicy) {
                    punchPolicy = (shift as any).punchPolicy;
                    this.logger.debug(`[PUNCH-OUT] Found punch policy: ${punchPolicy}`);
                }
            }
        } catch (e) {
            this.logger.debug('Failed to determine punch policy for punchOut; defaulting to FIRST_LAST', e);
        }
        if (!punchPolicy) punchPolicy = 'FIRST_LAST';

        // 7.5) NATURAL SEQUENCE VALIDATION
        if (punchPolicy === 'MULTIPLE') {
            if (!lastPunch) {
                throw new BadRequestException('Cannot punch OUT. You must punch IN first.');
            }
            if (lastPunch.type === PunchType.OUT) {
                throw new BadRequestException('Cannot punch OUT again. You must punch IN first before punching OUT again.');
            }
        } else {
            if (!lastPunch || !punches.some(p => p.type === PunchType.IN)) {
                throw new BadRequestException('Cannot punch OUT. You must punch IN first.');
            }
        }

        // 9) Enforce policy rules for OUT based on punch policy
        if (punchPolicy === 'FIRST_LAST') {
            const existingOutPunches = punches.filter(p => p.type === PunchType.OUT);

            if (existingOutPunches.length >= 1) {
                const lastOutTime = new Date(existingOutPunches[existingOutPunches.length - 1].time);

                // Only replace if new OUT time is later than existing OUT
                if (now.getTime() > lastOutTime.getTime()) {
                    this.logger.debug(`[PUNCH-OUT POLICY] FIRST_LAST policy: New OUT time ${now.toISOString()} is later than existing ${lastOutTime.toISOString()}, replacing`);

                    // Remove all existing OUT punches
                    await this.attendanceModel.updateOne(
                        { _id: attendance._id },
                        { $pull: { punches: { type: PunchType.OUT } } }
                    );
                } else {
                    // New OUT is earlier or same time, acknowledge but don't record
                    this.logger.log(`[PUNCH-OUT POLICY] FIRST_LAST policy: Punch OUT acknowledged but not recorded for employee ${dto.employeeId} - existing OUT ${lastOutTime.toISOString()} is later than or equal to new OUT ${now.toISOString()}`);

                    // Return success response without recording
                    const currentRecord = await this.attendanceModel.findById(attendance._id);
                    return currentRecord!.toObject();
                }
            } else {
                this.logger.debug(`[PUNCH-OUT POLICY] FIRST_LAST policy: Recording first punch OUT for employee ${dto.employeeId}`);
            }
        } else if (punchPolicy === 'MULTIPLE') {
            this.logger.debug(`[PUNCH-OUT POLICY] MULTIPLE policy: Accepting punch OUT for employee ${dto.employeeId}`);
        }

        // 10) Append OUT punch
        await this.attendanceModel.updateOne(
            { _id: attendance._id },
            { $push: { punches: { type: PunchType.OUT, time: new Date(now) } } },
        );

        this.logger.log(`[PUNCH-OUT SUCCESS] Punch OUT recorded: Employee ${dto.employeeId}, Time: ${now.toISOString()}, Policy: ${punchPolicy}`);

        // BEFORE recompute: remove any open MISSED_PUNCH exceptions for this attendance (they are resolved by the OUT)
        let removedMissedCount = 0;
        try {
            const openMissed = await this.exceptionModel.find({ attendanceRecordId: attendance._id, type: TimeExceptionType.MISSED_PUNCH });
            if (openMissed && openMissed.length) {
                const idsToRemove = openMissed.map(m => m._id);
                try {
                    await this.exceptionModel.deleteMany({ _id: { $in: idsToRemove } });
                    // Also remove references on attendance.exceptionIds (best-effort)
                    try {
                        await this.attendanceModel.updateOne({ _id: attendance._id }, { $pull: { exceptionIds: { $in: idsToRemove as any } } });
                    } catch (e) {
                        this.logger.warn('Failed to pull removed missed-punch ids from attendance.exceptionIds', e);
                    }
                    removedMissedCount = idsToRemove.length;
                } catch (e) {
                    this.logger.warn('Failed to delete MISSED_PUNCH exceptions before recompute', e);
                }
            }
        } catch (e) {
            this.logger.warn('Failed to lookup MISSED_PUNCH exceptions before recompute', e);
        }

        // 11) Recompute totals and side effects. If we removed MISSED_PUNCHs just now, suppress creating LATE
        await this.recompute(attendance._id, { suppressLateOnResolvedMissed: removedMissedCount > 0, suppressShortTimeCreation: true });

        // Return the updated attendance record (same response shape as punchIn)
        const updated = await this.attendanceModel.findById(attendance._id);
        return updated ? updated.toObject() : null;
    }

    // ============================================================
    // CALCULATION LOGIC
    // ============================================================
    computeTotalMinutes(rec: AttendanceRecord): number {
        const punches = rec.punches
            ?.slice()
            .sort((a, b) => +new Date(a.time) - +new Date(b.time));

        if (!punches?.length) return 0;

        let total = 0;
        let i = 0;

        while (i < punches.length) {
            if (punches[i].type === PunchType.IN) {
                let nextOutFound = false;

                for (let j = i + 1; j < punches.length; j++) {
                    if (punches[j].type === PunchType.OUT) {
                        total += new Date(punches[j].time).getTime()
                            - new Date(punches[i].time).getTime();

                        i = j + 1;
                        nextOutFound = true;
                        break;
                    }
                }

                if (!nextOutFound) {
                    i++;
                }
            } else {
                i++;
            }
        }

        return Math.round(total / 60000);
    }

    private async isWeeklyRest(employeeId: string | Types.ObjectId, date: Date): Promise<boolean> {
        try {
            const start = new Date(date); start.setHours(0,0,0,0);
            const end = new Date(date); end.setHours(23,59,59,999);
            const empOid = typeof employeeId === 'string' ? new Types.ObjectId(employeeId) : employeeId;

            const assignment = await this.shiftAssignmentModel.findOne({
                employeeId: empOid,
                status: { $in: [ShiftAssignmentStatus.PENDING, ShiftAssignmentStatus.APPROVED] },
                startDate: { $lte: end },
                $or: [{ endDate: { $exists: false } }, { endDate: { $gte: start } }],
            }).lean();

            if (!assignment) return false;
            if (!assignment.scheduleRuleId) return false;

            const rule = await this.scheduleRuleModel.findById(assignment.scheduleRuleId).lean();
            if (!rule || !rule.active || !rule.pattern) return false;

            const pattern = (rule.pattern || '').toUpperCase();
            if (pattern.startsWith('WEEKLY:')) {
                const daysPart = pattern.split(':')[1] || '';
                const allowedDays = daysPart.split(',')
                    .map(d => d.trim().toUpperCase())
                    .filter(d => d.length > 0)
                    .map(d => d.length >= 3 ? d.substring(0, 3) : d);

                const dayNames = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
                const today = dayNames[date.getDay()];

                return !allowedDays.includes(today);
            }

            return false;
        } catch (e) {
            this.logger.warn('isWeeklyRest check failed', e);
            return false;
        }
    }

    async computeLateness(record: AttendanceRecord) {
        const punches = record.punches
            ?.slice()
            .sort((a, b) => +new Date(a.time) - +new Date(b.time));
        const firstIn = punches?.find((p) => p.type === PunchType.IN);
        if (!firstIn) return 0;

        const recDate = new Date(firstIn.time);

        // Holiday suppression
        try {
            if (await this.holidayService.isHoliday(recDate)) {
                this.logger.debug(`[COMPUTE LATENESS] Date ${recDate.toDateString()} is holiday - no lateness`);
                return 0;
            }
        } catch (e) {
            this.logger.warn('HolidayService.isHoliday failed in computeLateness', e);
        }

        // Weekly rest suppression
        try {
            if (await this.isWeeklyRest(record.employeeId as any, recDate)) {
                this.logger.debug(`[COMPUTE LATENESS] Date ${recDate.toDateString()} is weekly rest - no lateness`);
                return 0;
            }
        } catch (e) {
            this.logger.warn('isWeeklyRest failed in computeLateness', e);
        }

        const start = new Date(recDate); start.setHours(0,0,0,0);
        const end = new Date(recDate); end.setHours(23,59,59,999);

        const asg = await this.shiftAssignmentModel.findOne({
            employeeId: record.employeeId,
            startDate: { $lte: end },
            $or: [{ endDate: { $exists: false } }, { endDate: { $gte: start } }],
        });

        if (!asg) return 0;

        const shift = await this.shiftModel.findById(asg.shiftId);
        if (!shift) return 0;

        const [h, m] = (shift.startTime || '00:00').split(':').map(Number);
        const scheduled = new Date(recDate); scheduled.setHours(h, m, 0, 0);

        const rule = await this.latenessRuleModel.findOne({ active: true });
        const grace = shift.graceInMinutes ?? rule?.gracePeriodMinutes ?? 0;

        const diff = new Date(firstIn.time).getTime() - (scheduled.getTime() + grace * 60000);
        return Math.max(0, Math.ceil(diff / 60000));
    }

    async computeEarlyLeave(record: AttendanceRecord) {
        const punches = record.punches
            ?.slice()
            .sort((a, b) => +new Date(a.time) - +new Date(b.time));
        const lastOut = punches?.reverse().find((p) => p.type === PunchType.OUT);
        if (!lastOut) return 0;

        const recDate = new Date(lastOut.time);

        // Holiday suppression
        try {
            if (await this.holidayService.isHoliday(recDate)) {
                this.logger.debug(`[COMPUTE EARLY LEAVE] Date ${recDate.toDateString()} is holiday - no early leave`);
                return 0;
            }
        } catch (e) {
            this.logger.warn('HolidayService.isHoliday failed in computeEarlyLeave', e);
        }

        // Weekly rest suppression
        try {
            if (await this.isWeeklyRest(record.employeeId as any, recDate)) {
                this.logger.debug(`[COMPUTE EARLY LEAVE] Date ${recDate.toDateString()} is weekly rest - no early leave`);
                return 0;
            }
        } catch (e) {
            this.logger.warn('isWeeklyRest failed in computeEarlyLeave', e);
        }

        const start = new Date(recDate); start.setHours(0,0,0,0);
        const end = new Date(recDate); end.setHours(23,59,59,999);

        const asg = await this.shiftAssignmentModel.findOne({
            employeeId: record.employeeId,
            startDate: { $lte: end },
            $or: [{ endDate: { $exists: false } }, { endDate: { $gte: start } }],
        });
        if (!asg) return 0;
        const shift = await this.shiftModel.findById(asg.shiftId);
        if (!shift) return 0;

        const [eh, em] = (shift.endTime || '00:00').split(':').map(Number);
        const scheduled = new Date(recDate); scheduled.setHours(eh, em, 0, 0);

        const grace = shift.graceOutMinutes ?? 0;

        const diff = (scheduled.getTime() - grace * 60000) - new Date(lastOut.time).getTime();
        return Math.max(0, Math.ceil(diff / 60000));
    }

    async computeOvertime(record: AttendanceRecord) {
        const punches = record.punches
            ?.slice()
            .sort((a, b) => +new Date(a.time) - +new Date(b.time));
        const lastOut = punches?.reverse().find((p) => p.type === PunchType.OUT);
        if (!lastOut) return 0;

        const recDate = new Date(lastOut.time);

        const start = new Date(recDate); start.setHours(0,0,0,0);
        const end = new Date(recDate); end.setHours(23,59,59,999);

        const asg = await this.shiftAssignmentModel.findOne({
            employeeId: record.employeeId,
            startDate: { $lte: end },
            $or: [{ endDate: { $exists: false } }, { endDate: { $gte: start } }],
        });
        if (!asg) return 0;
        const shift = await this.shiftModel.findById(asg.shiftId);
        if (!shift) return 0;

        const [eh, em] = (shift.endTime || '00:00').split(':').map(Number);
        const scheduledEnd = new Date(recDate); scheduledEnd.setHours(eh, em, 0, 0);

        const diff = new Date(lastOut.time).getTime() - scheduledEnd.getTime();
        const minutes = Math.max(0, Math.ceil(diff / 60000));
        if (minutes <= 0) return 0;

        // Check if it's a holiday
        let isHoliday = false;
        try {
            isHoliday = await this.holidayService.isHoliday(recDate);
        } catch (e) {
            this.logger.warn('HolidayService.isHoliday failed in computeOvertime', e);
        }

        if (shift.requiresApprovalForOvertime) {
            const rule = await this.overtimeRuleModel.findOne({ active: true });
            if (!rule || !rule.approved) {
                await this.createTimeExceptionAuto({
                    employeeId: record.employeeId,
                    attendanceRecordId: (record as any)._id,
                    type: TimeExceptionType.OVERTIME_REQUEST,
                    reason: isHoliday ? 'Holiday overtime - requires approval' : 'Overtime requires approval',
                });
            }
        }

        return minutes;
    }

    // ============================================================
    // RECOMPUTE
    // ============================================================

    private async recompute(attendanceId: Types.ObjectId | string, opts?: { suppressLateOnResolvedMissed?: boolean; suppressShortTimeCreation?: boolean }) {
         const att = await this.attendanceModel.findById(attendanceId);
         if (!att) return;

         this.logger.debug(`[RECOMPUTE] Starting recompute for attendance ${attendanceId}`);

        // 1) compute total minutes from punches
        const total = this.computeTotalMinutes(att.toObject() as AttendanceRecord);

        // Subtract approved break minutes (so totalWorkMinutes reflects net worked minutes)
        let approvedBreakMinutesForTotal = 0;
        try {
            if (typeof this.breakPermissionService?.calculateApprovedBreakMinutes === 'function') {
                approvedBreakMinutesForTotal = await this.breakPermissionService.calculateApprovedBreakMinutes(String(att._id));
            } else {
                this.logger.debug('breakPermissionService not available for approved break minutes (total adjustment)');
            }
        } catch (e) {
            this.logger.warn('Failed to fetch approved break minutes for total adjustment', e);
            approvedBreakMinutesForTotal = 0;
        }

        att.totalWorkMinutes = Math.max(0, total - (approvedBreakMinutesForTotal || 0));
        this.logger.debug(`[RECOMPUTE] Total work minutes (computed ${total} - approvedBreaks ${approvedBreakMinutesForTotal}) => ${att.totalWorkMinutes}`);

        // 2) prepare punches and counts
        const punches = (att.punches || []).slice().sort((a, b) => +new Date(a.time) - +new Date(b.time));
        const inCount = punches.filter(p => p.type === PunchType.IN).length;
        const outCount = punches.filter(p => p.type === PunchType.OUT).length;

        // Determine record date from punches
        const recDate = this.getRecordDate(att.toObject() as AttendanceRecord);
        let isHoliday = false;
        let isWeeklyRest = false;

        try {
            isHoliday = await this.holidayService.isHoliday(recDate);
        } catch (err) {
            this.logger.warn('holidayService.isHoliday failed during recompute', err);
        }

        try {
            isWeeklyRest = await this.isWeeklyRest(att.employeeId as any, recDate);
        } catch (err) {
            this.logger.warn('isWeeklyRest failed during recompute', err);
        }

        this.logger.debug(`[RECOMPUTE] Date: ${recDate.toDateString()}, isHoliday: ${isHoliday}, isWeeklyRest: ${isWeeklyRest}`);

        // 3) lateness detection (MOVED BEFORE MISSED_PUNCH creation)
        try {
            const lateMinutes = await this.computeLateness(att.toObject() as AttendanceRecord);
            if (lateMinutes > 0) {
                // Only create a LATE exception if one doesn't already exist for this attendance
                const existingLate = await this.exceptionModel.findOne({ attendanceRecordId: att._id, type: TimeExceptionType.LATE });
                const existingMissed = await this.exceptionModel.findOne({ attendanceRecordId: att._id, type: TimeExceptionType.MISSED_PUNCH });

                if (existingLate) {
                    this.logger.debug('[RECOMPUTE] LATE exception already exists for this attendance - skipping creation');
                } else if (existingMissed) {
                    // If there is an existing MISSED_PUNCH exception for this attendance, do not replace it with a LATE
                    this.logger.debug('[RECOMPUTE] Existing MISSED_PUNCH found - skipping creation of LATE to avoid replacement');
                } else if (opts?.suppressLateOnResolvedMissed) {
                    // If caller indicates a MISSED_PUNCH was just resolved (deleted) as part of the same flow,
                    // do NOT create a LATE exception now (per business rule).
                    this.logger.debug('[RECOMPUTE] Suppressing creation of LATE because a MISSED_PUNCH was just resolved for this attendance');
                } else {
                    this.logger.debug(`[RECOMPUTE] Lateness detected: ${lateMinutes} minutes`);
                    const ex = await this.createTimeExceptionAuto({
                        employeeId: att.employeeId,
                        attendanceRecordId: att._id,
                        type: TimeExceptionType.LATE,
                        reason: `Auto-detected lateness: ${lateMinutes} minutes`,
                    });
                    if (ex) {
                        att.exceptionIds = att.exceptionIds || [];
                        att.exceptionIds.push(new Types.ObjectId((ex as any)._id));
                        att.finalisedForPayroll = false;

                        // Repeated lateness evaluation
                        try {
                            await this.repeatedLatenessService.evaluateAndEscalateIfNeeded(att.employeeId);
                        } catch (e) {
                            this.logger.warn('Repeated lateness evaluation failed', e);
                        }
                    }
                }
            }
        } catch (e) {
            this.logger.warn('computeLateness/recompute LATE handling failed', e);
        }

        // 4) detect unmatched punches -> potentially MISSED_PUNCH
        if (inCount > outCount) {
            att.hasMissedPunch = true;
            att.finalisedForPayroll = false;

            // only auto-create MISSED_PUNCH exception if NOT a holiday or weekly rest
            if (!isHoliday && !isWeeklyRest) {
                try {
                    // create missed punch only if not already present
                    const existing = await this.exceptionModel.findOne({ attendanceRecordId: att._id, type: TimeExceptionType.MISSED_PUNCH });
                    if (!existing) {
                        const ex = await this.createTimeExceptionAuto({
                            employeeId: att.employeeId,
                            attendanceRecordId: att._id,
                            type: TimeExceptionType.MISSED_PUNCH,
                            reason: 'Unmatched IN',
                        });
                        if (ex) {
                            att.exceptionIds = att.exceptionIds || [];
                            att.exceptionIds.push(new Types.ObjectId((ex as any)._id));

                            // Send notifications
                            try {
                                await this.notificationModel.create({
                                    to: att.employeeId as any,
                                    type: 'MISSED_PUNCH',
                                    message: `A missed punch was detected for attendance ${att._id}. Please complete your punches or request an exception.`,
                                } as any);
                            } catch (e) {
                                this.logger.warn('Failed to notify employee of missed punch', e);
                            }

                            // ... other notification logic
                        }
                    }
                } catch (e) {
                    this.logger.warn('Failed to create MISSED_PUNCH exception', e);
                }
            } else {
                this.logger.debug(`[RECOMPUTE] Missed punch on holiday/weekly rest for attendance ${att._id} - skipping MISSED_PUNCH exception`);
            }
        } else {
            att.hasMissedPunch = false;
        }

        // 5) short time detection (skip on holiday/weekly rest)
        try {
            if (!isHoliday && !isWeeklyRest) {
                const scheduledMinutes = await this.getScheduledMinutesForRecord(att.toObject() as AttendanceRecord);

                 // Subtract approved break minutes (only APPROVED permissions affect payroll)
                 let approvedBreakMinutes = 0;
                   try {
                     if (typeof this.breakPermissionService?.calculateApprovedBreakMinutes === 'function') {
                         approvedBreakMinutes = await this.breakPermissionService.calculateApprovedBreakMinutes(String(att._id));
                     } else {
                         this.logger.debug('breakPermissionService not available or missing calculateApprovedBreakMinutes');
                     }
                 } catch (e) {
                     this.logger.warn('Failed to fetch approved break minutes', e);
                     approvedBreakMinutes = 0;
                 }

                 const effectiveScheduled = Math.max(0, scheduledMinutes - (approvedBreakMinutes || 0));
                 const shortMinutes = Math.max(0, effectiveScheduled - att.totalWorkMinutes);
                const existingShorts = await this.exceptionModel.find({ attendanceRecordId: att._id, type: TimeExceptionType.SHORT_TIME });

                if (shortMinutes > 0) {
                    if (existingShorts && existingShorts.length > 0) {
                        // Update existing exception(s) reason and reopen if resolved
                        const ids = existingShorts.map(e => e._id);
                        try {
                            await this.exceptionModel.updateMany({ _id: { $in: ids } }, {
                                $set: {
                                    reason: `Auto-detected short time: ${shortMinutes} minutes`,
                                    status: TimeExceptionStatus.OPEN,
                                    updatedAt: new Date()
                                }
                            });
                            // ensure attendance.exceptionIds contains them
                            att.exceptionIds = att.exceptionIds || [];
                            existingShorts.forEach(e => {
                                const idStr = String(e._id);
                                if (!att.exceptionIds.some(id => String(id) === idStr)) att.exceptionIds.push(e._id as any);
                            });
                            att.finalisedForPayroll = false;
                        } catch (e) {
                            this.logger.warn('Failed to update existing SHORT_TIME exceptions', e);
                        }
                    } else {
                        // No existing SHORT_TIME: only create new if not suppressed
                        if (!opts?.suppressShortTimeCreation) {
                            try {
                                const ex = await this.createTimeExceptionAuto({
                                    employeeId: att.employeeId,
                                    attendanceRecordId: att._id,
                                    type: TimeExceptionType.SHORT_TIME,
                                    reason: `Auto-detected short time: ${shortMinutes} minutes`,
                                });
                                if (ex) {
                                    att.exceptionIds = att.exceptionIds || [];
                                    att.exceptionIds.push(new Types.ObjectId((ex as any)._id));
                                    att.finalisedForPayroll = false;
                                }
                            } catch (e) {
                                this.logger.warn('Failed to create SHORT_TIME exception', e);
                            }
                        } else {
                            // suppressed creation: do nothing (user requested not to create new exceptions on this flow)
                            this.logger.debug('[RECOMPUTE] shorten time creation suppressed; shortMinutes=%d, attendance=%s', shortMinutes, att._id);
                        }
                    }
                } else {
                    // Not short anymore: delete any existing SHORT_TIME exceptions
                    if (existingShorts && existingShorts.length) {
                        try {
                            const idsToDelete = existingShorts.map(e => e._id);
                            await this.exceptionModel.deleteMany({ _id: { $in: idsToDelete } });
                            att.exceptionIds = (att.exceptionIds || []).filter(id => !idsToDelete.some(d => String(d) === String(id)));

                            const otherOpen = await this.exceptionModel.findOne({ attendanceRecordId: att._id, status: { $ne: TimeExceptionStatus.RESOLVED } });
                            if (!otherOpen) att.finalisedForPayroll = true;
                        } catch (e) {
                            this.logger.warn('Failed to remove SHORT_TIME exceptions when resolved', e);
                        }
                    }
                }
            }
        } catch (e) {
            this.logger.warn('SHORT_TIME detection failed during recompute', e);
        }

        // 6) overtime detection
        try {
            const overtimeMinutes = await this.computeOvertime(att);
            if (overtimeMinutes > 0) {
                this.logger.debug(`[RECOMPUTE] Overtime detected: ${overtimeMinutes} minutes`);
                const ex = await this.createTimeExceptionAuto({
                    employeeId: att.employeeId,
                    attendanceRecordId: att._id,
                    type: TimeExceptionType.OVERTIME_REQUEST,
                    reason: `Auto-detected overtime: ${overtimeMinutes} minutes`,
                });
                if (ex) {
                    att.exceptionIds = att.exceptionIds || [];
                    att.exceptionIds.push(new Types.ObjectId((ex as any)._id));
                    att.finalisedForPayroll = false;
                }
            }
        } catch (e) {
            this.logger.warn('computeOvertime/recompute OVERTIME handling failed', e);
        }

        // --- FINALISATION RULE ---
        try {
            const unresolved = await this.correctionModel.findOne({
                attendanceRecord: att._id,
                status: { $in: [CorrectionRequestStatus.SUBMITTED, CorrectionRequestStatus.IN_REVIEW, CorrectionRequestStatus.ESCALATED] },
            }).lean();

            if ((inCount >= 1 && outCount >= 1) && !unresolved) {
                att.finalisedForPayroll = true;
                this.logger.debug(`[RECOMPUTE] Record finalized for payroll`);
            } else if (unresolved) {
                att.finalisedForPayroll = false;
                this.logger.debug(`[RECOMPUTE] Record not finalized due to unresolved correction request`);
            }
        } catch (e) {
            this.logger.warn('Failed to check unresolved correction requests during recompute', e);
        }

        // 7) persist changes
        try {
            await att.save();
            this.logger.debug(`[RECOMPUTE] Saved attendance record ${att._id}`);
        } catch (e) {
            this.logger.error('Failed to save attendance after recompute', e);
        }
    }

    /**
     * Public helper to trigger recompute for an attendance record by id.
     * Returns the updated attendance document.
     */
    async recomputeAttendanceById(attendanceId: string | Types.ObjectId, opts?: { suppressLateOnResolvedMissed?: boolean; suppressShortTimeCreation?: boolean }) {
        try {
            await this.recompute(typeof attendanceId === 'string' ? new Types.ObjectId(attendanceId) : attendanceId, opts);
            const updated = await this.attendanceModel.findById(attendanceId);
            return updated ? updated.toObject() : null;
        } catch (e) {
            this.logger.warn('recomputeAttendanceById failed', e);
            return null;
        }
    }

    // ------------------------------------------------------------------
    // Public API methods expected by AttendanceController
    // ------------------------------------------------------------------
    // async getTodayRecord(employeeId: string) {
    //     const date = new Date();
    //     const rec = await this.findOrCreateRecord(employeeId, date);
    //     const doc = await this.attendanceModel.findById(rec._id).lean();
    //     return doc;
    // }
    async getTodayRecord(employeeId: string) {
        const now = new Date();

        const start = new Date(now);
        start.setHours(0, 0, 0, 0);

        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        let empOid: Types.ObjectId;
        try {
            empOid = new Types.ObjectId(employeeId);
        } catch (e) {
            this.logger.error(`[getTodayRecord] Invalid employeeId format: ${employeeId}`);
            throw new BadRequestException(`Invalid employee ID format: ${employeeId}`);
        }

        // First try to find a record with punches in today's date range
        const recordWithPunches = await this.attendanceModel
            .findOne({
                employeeId: empOid,
                'punches.time': { $gte: start, $lte: end },
            })
            .lean();

        if (recordWithPunches) {
            return recordWithPunches;
        }

        // Also try with UTC date boundaries (in case of timezone issues)
        const utcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const utcEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

        const recordWithUtcPunches = await this.attendanceModel
            .findOne({
                employeeId: empOid,
                'punches.time': { $gte: utcStart, $lte: utcEnd },
            })
            .lean();

        if (recordWithUtcPunches) {
            return recordWithUtcPunches;
        }

        // Finally, check if there's any recent record (last 24 hours) as fallback
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recentRecord = await this.attendanceModel
            .findOne({
                employeeId: empOid,
                'punches.time': { $gte: yesterday },
            })
            .sort({ 'punches.time': -1 })
            .lean();

        return recentRecord;
    }

    async getMonthlyAttendance(employeeId: string, month: number, year: number) {
        // month: 1-12
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        end.setHours(23, 59, 59, 999);

        let empOid: Types.ObjectId;
        try {
            empOid = new Types.ObjectId(employeeId);
        } catch (e) {
            this.logger.error(`[getMonthlyAttendance] Invalid employeeId format: ${employeeId}`);
            throw new BadRequestException(`Invalid employee ID format: ${employeeId}`);
        }

        const records = await this.attendanceModel.find({
            employeeId: empOid,
            $or: [
                { 'punches.time': { $gte: start, $lte: end } },
                { createdAt: { $gte: start, $lte: end } }
            ]
        }).sort({ createdAt: 1 }).lean();

        return records;
    }

    async getPayrollReadyAttendance(month: number, year: number) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        end.setHours(23, 59, 59, 999);

        const records = await this.attendanceModel.find({
            finalisedForPayroll: true,
            $or: [
                { 'punches.time': { $gte: start, $lte: end } },
                { createdAt: { $gte: start, $lte: end } }
            ]
        }).lean();

        return records;
    }

    async updateAttendanceRecord(id: string, dto: any) {
        const att = await this.attendanceModel.findById(id);
        if (!att) throw new NotFoundException('Attendance record not found');

        // Keep previous state for audit
        const prev = att.toObject();

        // Apply recognized fields from dto
        const updatable = ['punches', 'exceptionIds', 'finalisedForPayroll', 'totalWorkMinutes', 'hasMissedPunch'];
        for (const k of updatable) {
            if (k in dto) {
                (att as any)[k] = (dto as any)[k];
            }
        }

        // Save and recompute
        await att.save();
        await this.recompute(att._id);

        return { record: att.toObject(), previousState: prev, correctionApplied: 'updateAttendanceRecord' };
    }

    async reviewAttendanceRecord(recordId: string) {
        const att = await this.attendanceModel.findById(recordId).lean();
        if (!att) throw new NotFoundException('Attendance record not found');

        const issues: any[] = [];
        // Basic checks
        const punches = (att.punches || []).slice().sort((a: any, b: any) => +new Date(a.time) - +new Date(b.time));
        if (punches.length === 0) {
            issues.push({ type: 'NO_PUNCH', severity: 'HIGH', description: 'No punches recorded' });
        }

        // consecutive same-type check
        for (let i = 1; i < punches.length; i++) {
            if (punches[i].type === punches[i - 1].type) {
                issues.push({ type: 'INVALID_SEQUENCE', severity: 'MEDIUM', description: 'Consecutive punches with same type' });
                break;
            }
        }

        if (punches.filter((p: any) => p.type === 1).length > punches.filter((p: any) => p.type === 2).length) {
            issues.push({ type: 'MISSING_PUNCH', severity: 'HIGH', description: 'Missing punch OUT' });
        }

        // short time detection using existing helpers
        try {
            const scheduledMinutes = await this.getScheduledMinutesForRecord(att as any);
            const total = this.computeTotalMinutes(att as any);
            const approvedBreakMinutes = typeof this.breakPermissionService?.calculateApprovedBreakMinutes === 'function'
                ? await this.breakPermissionService.calculateApprovedBreakMinutes(String((att as any)._id))
                : 0;
            const effectiveScheduled = Math.max(0, scheduledMinutes - (approvedBreakMinutes || 0));
            if (effectiveScheduled > (att.totalWorkMinutes || total)) {
                issues.push({ type: 'SHORT_TIME', severity: 'MEDIUM', description: `Short time detected: ${effectiveScheduled - (att.totalWorkMinutes || total)} minutes` });
            }
        } catch (e) {
            this.logger.warn('reviewAttendanceRecord short time detection failed', e);
        }

        // Decide canFinalize: no HIGH issues and has both IN and OUT
        const hasHigh = issues.some(i => i.severity === 'HIGH');
        const inCount = punches.filter((p: any) => p.type === 1).length;
        const outCount = punches.filter((p: any) => p.type === 2).length;
        const canFinalize = !hasHigh && inCount >= 1 && outCount >= 1;

        return { record: att, issues, canFinalize };
    }

    async correctAttendanceRecord(dto: any) {
        if (!dto || !dto.attendanceRecordId) throw new BadRequestException('attendanceRecordId is required');
        const att = await this.attendanceModel.findById(dto.attendanceRecordId);
        if (!att) throw new NotFoundException('Attendance record not found');

        const prev = att.toObject();
        let applied = [] as string[];

        // Add missing OUT
        if (dto.addPunchOut) {
            const parsed = this.parseCustomDateFormat(dto.addPunchOut as any);
            if (!parsed) throw new BadRequestException('Invalid addPunchOut format');
            att.punches = att.punches || [];
            att.punches.push({ type: PunchType.OUT, time: parsed });
            applied.push('addPunchOut');
        }

        // Add missing IN
        if (dto.addPunchIn) {
            const parsed = this.parseCustomDateFormat(dto.addPunchIn as any);
            if (!parsed) throw new BadRequestException('Invalid addPunchIn format');
            att.punches = att.punches || [];
            att.punches.push({ type: PunchType.IN, time: parsed });
            applied.push('addPunchIn');
        }

        if (dto.removePunchIndex !== undefined) {
            const idx = Number(dto.removePunchIndex);
            if (!Number.isInteger(idx) || idx < 0 || idx >= (att.punches || []).length) throw new BadRequestException('removePunchIndex out of range');
            att.punches.splice(idx, 1);
            applied.push('removePunchIndex');
        }

        if (dto.correctedPunches && Array.isArray(dto.correctedPunches)) {
            // replace entire punches (map incoming types to PunchType enum)
            att.punches = dto.correctedPunches.map((p: any) => {
                const isIn = (typeof p.type === 'string' && p.type.toUpperCase() === 'IN') || p.type === PunchType.IN || p.type === 1;
                return { type: isIn ? PunchType.IN : PunchType.OUT, time: this.parseCustomDateFormat(p.time) } as any;
            });
            applied.push('correctedPunches');
        }

        if (dto.correctionReason) {
            applied.push('correctionReason');
        }

        await att.save();
        // Recompute to apply changes
        await this.recompute(att._id);

        return { record: att.toObject(), correctionApplied: applied.join(','), previousState: prev };
    }

    async bulkReviewAttendance(dto: { employeeId: string; startDate: string; endDate: string; filterByIssue?: string }) {
        if (!dto.employeeId || !dto.startDate || !dto.endDate) throw new BadRequestException('employeeId, startDate, endDate required');
        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        end.setHours(23, 59, 59, 999);

        let empOid: Types.ObjectId;
        try {
            empOid = new Types.ObjectId(dto.employeeId);
        } catch (e) {
            this.logger.error(`[bulkReviewAttendance] Invalid employeeId format: ${dto.employeeId}`);
            throw new BadRequestException(`Invalid employee ID format: ${dto.employeeId}`);
        }

        const records = await this.attendanceModel.find({
            employeeId: empOid,
            $or: [
                { 'punches.time': { $gte: start, $lte: end } },
                { createdAt: { $gte: start, $lte: end } }
            ]
        }).sort({ createdAt: 1 }).lean();

        const results = [] as any[];
        for (const r of records) {
            const review = await this.reviewAttendanceRecord(String((r as any)._id));
            if (!dto.filterByIssue || dto.filterByIssue === 'ALL') {
                results.push({ recordId: (r as any)._id, date: this.getRecordDate(r as any).toISOString().split('T')[0], issues: review.issues, canFinalize: review.canFinalize });
            } else {
                // include only if has the issue requested
                const has = review.issues.some((i: any) => i.type === dto.filterByIssue);
                if (has) results.push({ recordId: (r as any)._id, date: this.getRecordDate(r as any).toISOString().split('T')[0], issues: review.issues, canFinalize: review.canFinalize });
            }
        }

        return results;
    }

    // SCHEDULED MINUTES helpers (public wrapper for other modules + internal implementation)
    public async scheduledMinutesForRecord(att: any): Promise<number> {
        // backward-compatible wrapper used by other modules
        return this.getScheduledMinutesForRecord(att as AttendanceRecord);
    }

    public async getScheduledMinutesForRecord(att: AttendanceRecord): Promise<number> {
        try {
            const recDate = this.getRecordDate(att);
            const dayStart = new Date(recDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(recDate);
            dayEnd.setHours(23, 59, 59, 999);

            const assignment = await this.shiftAssignmentModel.findOne({
                employeeId: new Types.ObjectId(att.employeeId as any),
                status: {$in: [ShiftAssignmentStatus.PENDING, ShiftAssignmentStatus.APPROVED]},
                startDate: {$lte: dayEnd},
                $or: [{endDate: {$exists: false}}, {endDate: {$gte: dayStart}}],
            }).lean();

            if (!assignment) return 0;

            const shift = await this.shiftModel.findById(assignment.shiftId).lean();
            if (!shift) return 0;

            const [sh, sm] = (shift.startTime || '00:00').split(':').map(Number);
            const [eh, em] = (shift.endTime || '00:00').split(':').map(Number);

            const scheduledStart = new Date(recDate);
            scheduledStart.setHours(sh, sm, 0, 0);

            const scheduledEnd = new Date(recDate);
            scheduledEnd.setHours(eh, em, 0, 0);

            if (scheduledEnd.getTime() <= scheduledStart.getTime()) scheduledEnd.setDate(scheduledEnd.getDate() + 1);

            const overlapStart = new Date(Math.max(scheduledStart.getTime(), dayStart.getTime()));
            const overlapEnd = new Date(Math.min(scheduledEnd.getTime(), dayEnd.getTime()));

            if (overlapEnd.getTime() <= overlapStart.getTime()) return 0;

            return Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / 60000);
        } catch (e) {
            this.logger.warn('getScheduledMinutesForRecord failed', e);
            return 0;
        }
    }

    async createAttendanceRecord(dto: any) {
        if (!dto.employeeId || !dto.punches || dto.punches.length === 0) {
            throw new BadRequestException('employeeId and punches array are required');
        }

        let empOid: Types.ObjectId;
        try {
            empOid = new Types.ObjectId(dto.employeeId);
        } catch (e) {
            throw new BadRequestException(`Invalid employee ID format: ${dto.employeeId}`);
        }

        // Parse and validate punches
        const parsedPunches: Array<{ type: PunchType; time: Date }> = [];
        for (const punch of dto.punches) {
            const isIn = (typeof punch.type === 'string' && punch.type.toUpperCase() === 'IN') || punch.type === PunchType.IN || punch.type === 1;
            const punchType = isIn ? PunchType.IN : PunchType.OUT;

            let punchTime: Date | null = null;
            if (typeof punch.time === 'string') {
                punchTime = this.parseCustomDateFormat(punch.time);
                if (!punchTime) {
                    throw new BadRequestException(`Invalid punch time format: ${punch.time}`);
                }
            } else if (punch.time instanceof Date) {
                punchTime = punch.time;
            } else {
                throw new BadRequestException(`Invalid punch time: ${punch.time}`);
            }

            // At this point, punchTime is guaranteed to be Date (not null)
            parsedPunches.push({ type: punchType, time: punchTime as Date });
        }

        // Check if attendance record already exists for that day
        const firstPunch = parsedPunches[0].time;
        const dayStart = new Date(firstPunch);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(firstPunch);
        dayEnd.setHours(23, 59, 59, 999);

        const existingRecord = await this.attendanceModel.findOne({
            employeeId: empOid,
            'punches.time': {
                $gte: dayStart,
                $lte: dayEnd
            }
        });

        if (existingRecord) {
            throw new BadRequestException(`Attendance record already exists for this employee on ${dayStart.toLocaleDateString()}`);
        }

        // Create new attendance record
        const newRecord = new this.attendanceModel({
            employeeId: empOid,
            punches: parsedPunches,
            totalWorkMinutes: 0,
            hasMissedPunch: false,
            finalisedForPayroll: false,
            exceptionIds: []
        });

        await newRecord.save();

        // Recompute to calculate totalWorkMinutes and other properties
        await this.recompute(newRecord._id);

        const updatedRecord = await this.attendanceModel.findById(newRecord._id);

        this.logger.log(`[createAttendanceRecord] Created new attendance record for employee ${empOid} on ${firstPunch.toLocaleDateString()} by ${dto.createdBy || 'SYSTEM'}`);

        return {
            message: 'Attendance record created successfully',
            record: updatedRecord?.toObject(),
            reason: dto.reason || 'Manual creation by department head'
        };
    }
}
