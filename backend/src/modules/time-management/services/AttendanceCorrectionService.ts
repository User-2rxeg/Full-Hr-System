import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';

import {
    AttendanceCorrectionRequest,
    AttendanceCorrectionRequestDocument,
} from '../models/attendance-correction-request.schema';
import {
    AttendanceRecord,
    AttendanceRecordDocument,
} from '../models/attendance-record.schema';
import {
    TimeException,
    TimeExceptionDocument,
} from '../models/time-exception.schema';

import {
    CorrectionRequestStatus,
    TimeExceptionStatus,
} from '../models/enums';

import { NotificationLog } from '../models/notification-log.schema';

import {
    RequestCorrectionDto,
    ReviewCorrectionDto,
} from '../dto/AttendanceCorrectionDtos';

@Injectable()
export class AttendanceCorrectionService {
    constructor(
        @InjectModel(AttendanceCorrectionRequest.name)
        private readonly correctionModel: Model<AttendanceCorrectionRequestDocument>,

        @InjectModel(AttendanceRecord.name)
        private readonly attendanceModel: Model<AttendanceRecordDocument>,

        @InjectModel(TimeException.name)
        private readonly exceptionModel: Model<TimeExceptionDocument>,

        @InjectModel(NotificationLog.name)
        private readonly notificationModel: Model<any>,
    ) {}

    // 1.5) Mark correction as IN_REVIEW (when review button is clicked)
    async startReview(correctionRequestId: string) {
        console.log('[START_REVIEW] Called with correctionRequestId:', correctionRequestId);

        const request = await this.correctionModel.findById(correctionRequestId);
        console.log('[START_REVIEW] Found request:', request);

        if (!request) {
            throw new NotFoundException('Correction request not found');
        }

        console.log('[START_REVIEW] Current status:', request.status);

        if (request.status !== CorrectionRequestStatus.SUBMITTED) {
            throw new BadRequestException(`Only SUBMITTED corrections can be marked as IN_REVIEW. Current status: ${request.status}`);
        }

        // Update status
        request.status = CorrectionRequestStatus.IN_REVIEW as any;
        console.log('[START_REVIEW] Status set to:', request.status);

        // Save to database
        const saved = await request.save();
        console.log('[START_REVIEW] Saved request with status:', saved.status);

        // Notify employee that correction is being reviewed
        try {
            await this.notificationModel.create({
                to: request.employeeId,
                type: 'CORRECTION_UNDER_REVIEW',
                message: `Your correction request is now being reviewed by HR`,
            });
            console.log('[START_REVIEW] Notification created for employee:', request.employeeId);
        } catch (notifErr) {
            console.warn('[START_REVIEW] Failed to create notification:', notifErr);
        }

        return saved;
    }

    // 1) Submit correction request
    async requestCorrection(dto: RequestCorrectionDto): Promise<AttendanceCorrectionRequest> {
        const { employeeId, attendanceRecordId, reason } = dto;

        const attendance = await this.attendanceModel.findById(attendanceRecordId);
        if (!attendance) throw new NotFoundException('Attendance record not found');

        if (attendance.employeeId.toString() !== employeeId) {
            throw new BadRequestException('Attendance record does not belong to this employee');
        }

        const existing = await this.correctionModel.findOne({
            attendanceRecord: attendance._id,
            status: { $in: [CorrectionRequestStatus.SUBMITTED, CorrectionRequestStatus.IN_REVIEW] },
        });

        if (existing) throw new BadRequestException('A correction request is already pending for this record');

        const request = new this.correctionModel({
            employeeId: new Types.ObjectId(employeeId),
            attendanceRecord: attendance._id,
            reason,
            status: CorrectionRequestStatus.SUBMITTED,
        });

        // Freeze for payroll
        attendance.finalisedForPayroll = false;
        await attendance.save();

        // Notification entry
        await this.notificationModel.create({
            to: attendance.employeeId,
            type: 'CORRECTION_REQUEST_SUBMITTED',
            message: `Correction request submitted for attendance ${attendance._id}`,
        });

        return await request.save();
    }

    // 2) Review (approve/reject)
    async reviewCorrection(dto: ReviewCorrectionDto) {
        const { correctionRequestId, action, reviewerId, note } = dto;

        const request = await this.correctionModel.findById(correctionRequestId);
        if (!request) throw new NotFoundException('Correction request not found');

        if (![CorrectionRequestStatus.SUBMITTED, CorrectionRequestStatus.IN_REVIEW].includes(request.status as any)) {
            throw new BadRequestException('Correction request already processed');
        }

        request.status = CorrectionRequestStatus.IN_REVIEW as any;
        await request.save();

        const attendance = await this.attendanceModel.findById(request.attendanceRecord);
        if (!attendance) throw new NotFoundException('Attendance record missing');

        if (action === 'APPROVE') {
            request.status = CorrectionRequestStatus.APPROVED as any;

            // Resolve time exception if exists
            const ex = await this.exceptionModel.findOne({
                attendanceRecordId: attendance._id,
                status: { $ne: TimeExceptionStatus.RESOLVED },
            });

            if (ex) {
                ex.status = TimeExceptionStatus.RESOLVED as any;
                ex.reason = `Resolved via correction approval: ${note || ''}`;
                await ex.save();
            }

            // Try apply correction details (best-effort)
            try {
                const detailsNotif: any = await this.notificationModel.findOne({
                    type: 'CORRECTION_DETAILS',
                    message: { $regex: String(request._id) },
                }).lean();

                if (detailsNotif && detailsNotif.message) {
                    let payload: any = null;
                    try { payload = JSON.parse(detailsNotif.message); } catch { payload = null; }
                    const details = payload ? payload.details : null;

                    if (details && details.type) {
                        attendance.punches = attendance.punches || [];
                        const correctedIso = details.correctedIso || null;
                        const punchType = details.punchType || 'OUT';

                        // Handle MISSING_PUNCH_IN and MISSING_PUNCH_OUT
                        if (details.type === 'MISSING_PUNCH_IN' || details.type === 'MISSING_PUNCH_OUT' || details.isMissingPunch) {
                            if (correctedIso) {
                                const newPunchType = details.type === 'MISSING_PUNCH_IN' ? 'IN' : (details.type === 'MISSING_PUNCH_OUT' ? 'OUT' : punchType);
                                attendance.punches.push({ type: newPunchType, time: new Date(correctedIso) } as any);
                                try { (attendance as any).markModified && (attendance as any).markModified('punches'); } catch (e) {}
                            }
                        }

                        // Handle legacy MISSING_PUNCH type
                        if (details.type === 'MISSING_PUNCH') {
                            const iso = details.missingPunchIso || correctedIso || null;
                            const t = details.missingPunchType || 'OUT';
                            if (iso) {
                                attendance.punches.push({ type: String(t), time: new Date(iso) } as any);
                                try { (attendance as any).markModified && (attendance as any).markModified('punches'); } catch (e) {}
                            }
                        }

                        // Handle INCORRECT_PUNCH_IN and INCORRECT_PUNCH_OUT
                        if (details.type === 'INCORRECT_PUNCH_IN' || details.type === 'INCORRECT_PUNCH_OUT' || details.type === 'INCORRECT_PUNCH') {
                            const targetType = details.type === 'INCORRECT_PUNCH_IN' ? 'IN' : (details.type === 'INCORRECT_PUNCH_OUT' ? 'OUT' : punchType);
                            const recordedTime = details.recordedOut || details.recordedTime || null;

                            if (correctedIso) {
                                // try exact match by recorded time
                                let foundIndex = -1;
                                if (recordedTime) {
                                    foundIndex = attendance.punches.findIndex((p: any) =>
                                        p && p.type && String(p.type).toUpperCase() === targetType &&
                                        new Date(p.time).toISOString() === new Date(recordedTime).toISOString()
                                    );
                                }

                                // fallback: last punch of target type
                                if (foundIndex === -1) {
                                    for (let i = attendance.punches.length - 1; i >= 0; i--) {
                                        const p = attendance.punches[i];
                                        if (p && p.type && String(p.type).toUpperCase() === targetType) { foundIndex = i; break; }
                                    }
                                }

                                if (foundIndex !== -1) {
                                    attendance.punches[foundIndex].time = new Date(correctedIso);
                                    try { (attendance as any).markModified && (attendance as any).markModified('punches'); } catch (e) {}
                                } else {
                                    // fuzzy match within tolerance
                                    const tolMs = 2 * 60 * 1000; // 2 minutes
                                    let bestIdx = -1;
                                    let bestDiff = Number.MAX_SAFE_INTEGER;
                                    const recordedDate = recordedTime ? new Date(recordedTime) : null;
                                    if (recordedDate && !isNaN(recordedDate.getTime())) {
                                        for (let i = 0; i < attendance.punches.length; i++) {
                                            const p = attendance.punches[i];
                                            if (p && p.type && String(p.type).toUpperCase() === targetType && p.time) {
                                                const pt = new Date(p.time);
                                                const diff = Math.abs(pt.getTime() - recordedDate.getTime());
                                                if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
                                            }
                                        }
                                    }

                                    if (bestIdx !== -1 && bestDiff <= tolMs) {
                                        attendance.punches[bestIdx].time = new Date(correctedIso);
                                        try { (attendance as any).markModified && (attendance as any).markModified('punches'); } catch (e) {}
                                    } else {
                                        // If no match found, add as new punch
                                        attendance.punches.push({ type: targetType, time: new Date(correctedIso) } as any);
                                        try { (attendance as any).markModified && (attendance as any).markModified('punches'); } catch (e) {}
                                    }
                                }
                            }
                        }

                        // recompute totalWorkMinutes
                        try {
                            const computeTotal = (punches: any[]) => {
                                if (!Array.isArray(punches)) return 0;
                                const sorted = punches.slice().map(p => ({ type: String(p.type), time: new Date(p.time) })).sort((a,b) => a.time.getTime() - b.time.getTime());
                                let total = 0;
                                let lastIn: Date | null = null;
                                for (const p of sorted) {
                                    if (!p.time || isNaN(p.time.getTime())) continue;
                                    const typ = String(p.type).toUpperCase();
                                    if (typ === 'IN') {
                                        lastIn = p.time;
                                    } else if (typ === 'OUT' && lastIn) {
                                        const diff = p.time.getTime() - lastIn.getTime();
                                        if (diff > 0) total += Math.round(diff / 60000);
                                        lastIn = null;
                                    }
                                }
                                return total;
                            };

                            attendance.totalWorkMinutes = computeTotal(attendance.punches as any[]);
                        } catch (e) {
                            // ignore compute errors
                        }

                        await attendance.save();
                    }
                }
            } catch (e) {
                // log and continue
                try { console.warn('Failed to apply correction details to attendance', e); } catch {}
            }

            // release for payroll
            attendance.finalisedForPayroll = true;
            await attendance.save();

            // notify employee
            await this.notificationModel.create({
                to: request.employeeId,
                type: 'CORRECTION_APPROVED',
                message: `Your correction request was approved.`,
            });
        } else {
            // reject
            request.status = CorrectionRequestStatus.REJECTED as any;
            await this.notificationModel.create({
                to: request.employeeId,
                type: 'CORRECTION_REJECTED',
                message: `Your correction request was rejected.`,
            });
        }

        if (note) (request as any).reviewNote = note;
        (request as any).reviewerId = reviewerId;

        return await request.save();
    }

    // 3) Get all corrections for an employee
    async getEmployeeCorrections(employeeId: string) {
        return await this.correctionModel
            .find({ employeeId: new Types.ObjectId(employeeId) })
            .populate('attendanceRecord')
            .sort({ createdAt: -1 });
    }

    // 4) Get pending corrections
    async getPendingCorrections() {
        return await this.correctionModel.find({ status: { $in: [CorrectionRequestStatus.SUBMITTED, CorrectionRequestStatus.IN_REVIEW] } }).sort({ createdAt: -1 });
    }

    // 5) Get all corrections (including history)
    async getAllCorrections() {
        return await this.correctionModel.find().sort({ createdAt: -1 });
    }

    // Permission & Overtime (via NotificationLog)
    async createPermissionRequest(dto: { employeeId: string; startTime: string; endTime: string; reason: string; deadline?: string }) {
        const payload = { employeeId: dto.employeeId, startTime: dto.startTime, endTime: dto.endTime, reason: dto.reason, deadline: dto.deadline || null };
        const msg = JSON.stringify(payload);
        const notif = await this.notificationModel.create({ to: new Types.ObjectId(dto.employeeId), type: 'PERMISSION_REQUEST', message: msg } as any);
        return notif.toObject();
    }

    async createOvertimeRequest(dto: { employeeId: string; date: string; minutes: number; reason: string; deadline?: string }) {
        const payload = { employeeId: dto.employeeId, date: dto.date, minutes: dto.minutes, reason: dto.reason, deadline: dto.deadline || null };
        const msg = JSON.stringify(payload);
        const notif = await this.notificationModel.create({ to: new Types.ObjectId(dto.employeeId), type: 'OVERTIME_REQUEST', message: msg } as any);
        return notif.toObject();
    }

    // Escalation cron
    @Cron('10 2 * * *')
    async runEscalationCron() {
        try {
            await this.escalateAttendanceCorrections();
            await this.escalateNotificationRequests();
        } catch (e) {
            console.error('runEscalationCron failed', e);
        }
    }

    private async escalateAttendanceCorrections() {
        const days = Number(process.env.CORRECTION_ESCALATION_DAYS ?? 7);
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - days);

        const toEscalate = await this.correctionModel.find({ status: { $in: [CorrectionRequestStatus.SUBMITTED, CorrectionRequestStatus.IN_REVIEW] }, createdAt: { $lte: threshold } }).lean();

        for (const r of toEscalate) {
            try {
                const curr = await this.correctionModel.findById(r._id);
                if (!curr) continue;
                if (curr.status === CorrectionRequestStatus.ESCALATED) continue;

                curr.status = CorrectionRequestStatus.ESCALATED as any;
                await curr.save();

                const msg = `Correction request ${r._id} escalated after ${days} days (auto).`;
                await this.notificationModel.create({ to: r.employeeId, type: 'CORRECTION_ESCALATED', message: msg } as any);
            } catch (e) {
                console.warn('Failed to escalate correction request', r._id, e);
            }
        }
    }

    private async escalateNotificationRequests() {
        const now = new Date();
        const types = ['PERMISSION_REQUEST', 'OVERTIME_REQUEST'];
        const rows = await this.notificationModel.find({ type: { $in: types } }).lean();

        for (const r of rows) {
            try {
                let payload: any = null;
                try { payload = JSON.parse(r.message); } catch { payload = null; }
                if (!payload) continue;

                const deadlineStr = payload.deadline;
                if (!deadlineStr) continue;

                const deadline = new Date(deadlineStr);
                if (isNaN(deadline.getTime())) continue;

                if (deadline <= now) {
                    const alreadyEscalated = await this.notificationModel.findOne({ type: r.type + '_ESCALATED', message: { $regex: String((r as any)._id) } }).lean();
                    if (alreadyEscalated) continue;

                    const msg = `${r.type} ${r._id} escalated after deadline ${deadline.toISOString()}`;
                    await this.notificationModel.create({ to: r.to, type: r.type + '_ESCALATED', message: msg } as any);
                }
            } catch (e) {
                console.warn('Failed processing notification row for escalation', e);
            }
        }
    }

    async checkIncorrectPunch(attendanceRecordId: string, correctedTimeIso: string) {
        const att = await this.attendanceModel.findById(attendanceRecordId).lean();
        if (!att) return { ok: false, reason: 'ATTENDANCE_NOT_FOUND' };

        const punches = att.punches || [];
        const outPunches = punches.filter((p: any) => p.type && p.type.toString().toUpperCase() === 'OUT');
        if (!outPunches || outPunches.length === 0) return { ok: false, reason: 'NO_OUT_PUNCH' };

        const recordedOut = outPunches.slice().sort((a: any,b: any) => new Date(a.time).getTime() - new Date(b.time).getTime()).pop();
        if (!recordedOut) return { ok: false, reason: 'NO_OUT_PUNCH' };

        const recordedTime = new Date(recordedOut.time);
        const correctedTime = new Date(correctedTimeIso);
        if (isNaN(correctedTime.getTime())) return { ok: false, reason: 'INVALID_CORRECTED_TIME' };

        const diffMs = Math.abs(recordedTime.getTime() - correctedTime.getTime());
        const same = diffMs <= 60 * 1000; // within 1 minute

        return { ok: true, hasOut: true, recordedOut: recordedTime.toISOString(), correctedTime: correctedTime.toISOString(), same };
    }

    // Check if a specific punch type exists in the attendance record
    async checkPunchExists(attendanceRecordId: string, punchType: 'IN' | 'OUT', correctedTimeIso?: string) {
        const att = await this.attendanceModel.findById(attendanceRecordId).lean();
        if (!att) return { ok: false, reason: 'ATTENDANCE_NOT_FOUND' };

        const punches = att.punches || [];
        const matchingPunches = punches.filter((p: any) =>
            p.type && p.type.toString().toUpperCase() === punchType.toUpperCase()
        );

        if (!matchingPunches || matchingPunches.length === 0) {
            return { ok: false, reason: 'NO_PUNCH_FOUND' };
        }

        // Get the last punch of the specified type
        const lastPunch = matchingPunches
            .slice()
            .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime())
            .pop();

        if (!lastPunch) {
            return { ok: false, reason: 'NO_PUNCH_FOUND' };
        }

        const recordedTime = new Date(lastPunch.time);

        // Check if corrected time is same as recorded time
        let same = false;
        if (correctedTimeIso) {
            const correctedTime = new Date(correctedTimeIso);
            if (!isNaN(correctedTime.getTime())) {
                const diffMs = Math.abs(recordedTime.getTime() - correctedTime.getTime());
                same = diffMs <= 60 * 1000; // within 1 minute
            }
        }

        return {
            ok: true,
            punchType,
            recordedTime: recordedTime.toISOString(),
            same
        };
    }

    // Check if attendance record exists
    async checkAttendanceExists(attendanceRecordId: string) {
        const att = await this.attendanceModel.findById(attendanceRecordId).lean();
        if (!att) return { ok: false, reason: 'ATTENDANCE_NOT_FOUND' };
        return { ok: true, attendanceRecord: att };
    }

    async recordCorrectionDetails(correctionRequestId: string, details: any) {
        const req = await this.correctionModel.findById(correctionRequestId).lean();
        const to = req ? req.employeeId : null;
        const payload = { correctionRequestId, details };
        await this.notificationModel.create({ to: to || null, type: 'CORRECTION_DETAILS', message: JSON.stringify(payload) } as any);
    }
}
