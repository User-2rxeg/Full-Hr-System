import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TimeException, TimeExceptionDocument } from '../models/time-exception.schema';
import { AttendanceRecord, AttendanceRecordDocument } from '../models/attendance-record.schema';
import { NotificationLog, NotificationLogDocument } from '../models/notification-log.schema';
import { TimeExceptionStatus } from '../models/enums';
import {BreakPermissionDto} from "../dto/BreakPermissionDto";

// export interface BreakPermissionDto {
//     employeeId: string;
//     attendanceRecordId: string;
//     startTime: Date;
//     endTime: Date;
//     reason: string;
// }

export interface ApproveBreakPermissionDto {
    approvedBy: string;
}

export interface RejectBreakPermissionDto {
    rejectionReason: string;
}

// Use SHORT_TIME type to represent break permissions
const BREAK_PERMISSION_TYPE = 'SHORT_TIME';

@Injectable()
export class BreakPermissionService {
    private readonly logger = new Logger(BreakPermissionService.name);
    // runtime-configurable limit for break permission duration (minutes)
    private maxLimitMinutes: number;

    constructor(
        @InjectModel(TimeException.name)
        private readonly exceptionModel: Model<TimeExceptionDocument>,
        @InjectModel(AttendanceRecord.name)
        private readonly attendanceModel: Model<AttendanceRecordDocument>,
        @InjectModel(NotificationLog.name)
        private readonly notificationModel: Model<NotificationLogDocument>,
    ) {}

    // Initialize runtime limit from env or default
    onModuleInit() {
        const maxEnv = process.env.BREAK_PERMISSION_MAX_MINUTES;
        const parsed = maxEnv ? parseInt(maxEnv, 10) : NaN;
        this.maxLimitMinutes = !isNaN(parsed) && parsed > 0 ? parsed : 180;
        this.logger.debug(`BreakPermissionService initialized with maxLimitMinutes=${this.maxLimitMinutes}`);
    }

    // Expose setter/getter to change limit at runtime
    setPermissionMaxLimit(minutes: number) {
        if (!Number.isInteger(minutes) || minutes <= 0) throw new BadRequestException('maxMinutes must be a positive integer');
        this.maxLimitMinutes = minutes;
        this.logger.log(`Break permission max limit updated to ${minutes} minutes`);
        return { maxMinutes: this.maxLimitMinutes };
    }

    getPermissionMaxLimit() {
        return { maxMinutes: this.maxLimitMinutes };
    }

    /**
     * Create a break permission request for a specific duration during shift
     * This time will be excluded from total working hours when approved
     */
    async createBreakPermission(dto: BreakPermissionDto): Promise<any> {
        try {
            const empOid = new Types.ObjectId(dto.employeeId);
            const attRecordId = new Types.ObjectId(dto.attendanceRecordId);

            if (!dto.startTime || !dto.endTime) {
                throw new BadRequestException('Start time and end time are required');
            }

            const start = new Date(dto.startTime);
            const end = new Date(dto.endTime);

            if (end <= start) {
                throw new BadRequestException('End time must be after start time');
            }

            // Calculate duration in minutes
            const duration = Math.ceil((end.getTime() - start.getTime()) / 60000);

            if (duration <= 0) {
                throw new BadRequestException('Break duration must be greater than 0');
            }

            const maxLimit = this.maxLimitMinutes ?? (process.env.BREAK_PERMISSION_MAX_MINUTES ? parseInt(process.env.BREAK_PERMISSION_MAX_MINUTES,10) : 180);
            if (isNaN(maxLimit) || maxLimit <= 0) {
                // fallback
            }

            if (duration > maxLimit) {
                throw new BadRequestException(`Requested break duration (${duration} minutes) exceeds allowed limit of ${maxLimit} minutes`);
            }

            // Verify attendance record exists and belongs to employee
            const attendanceRecord = await this.attendanceModel.findById(attRecordId);
            if (!attendanceRecord) {
                throw new NotFoundException('Attendance record not found');
            }

            if (attendanceRecord.employeeId.toString() !== empOid.toString()) {
                throw new BadRequestException('Attendance record does not belong to this employee');
            }

            // Create break permission using TimeException (marked with duration field)
            const breakPermission = await this.exceptionModel.create({
                employeeId: empOid,
                attendanceRecordId: attRecordId,
                type: BREAK_PERMISSION_TYPE,
                status: TimeExceptionStatus.PENDING,
                assignedTo: new Types.ObjectId(process.env.SYSTEM_USER_ID || '000000000000000000000000'),
                reason: `Break Permission: ${dto.reason}`,
                startTime: start,
                endTime: end,
                duration: duration,
            } as any);

            // Attach to attendance record
            attendanceRecord.exceptionIds = attendanceRecord.exceptionIds || [];
            attendanceRecord.exceptionIds.push(breakPermission._id);
            attendanceRecord.finalisedForPayroll = false;
            await attendanceRecord.save();

            // Create notification
            try {
                await this.notificationModel.create({
                    to: new Types.ObjectId(process.env.SYSTEM_USER_ID || '000000000000000000000000'),
                    type: 'BREAK_PERMISSION_REQUEST',
                    message: `Employee ${empOid} has requested a break permission. Duration: ${duration} minutes. Reason: ${dto.reason}`,
                    metadata: {
                        employeeId: empOid.toString(),
                        attendanceRecordId: attRecordId.toString(),
                        permissionId: breakPermission._id.toString(),
                        duration: duration,
                        reason: dto.reason,
                    },
                });
            } catch (e) {
                this.logger.warn('Failed to create notification', e);
            }

            this.logger.log(`✅ Break permission created for employee ${empOid} - Duration: ${duration} minutes`);
            return breakPermission;

        } catch (error: any) {
            this.logger.error('Error creating break permission:', error);
            throw error;
        }
    }

    /**
     * Get all break permissions (with optional filters)
     */
    async getAllBreakPermissions(employeeId?: string, status?: string): Promise<any[]> {
        try {
            const filter: any = { type: BREAK_PERMISSION_TYPE };

            if (employeeId) {
                filter.employeeId = new Types.ObjectId(employeeId);
            }

            if (status) {
                filter.status = status;
            }

            const permissions = await this.exceptionModel.find(filter)
                .populate('employeeId', 'name email')
                .sort({ createdAt: -1 })
                .lean();

            this.logger.log(`Retrieved ${permissions.length} break permissions`);
            return permissions;

        } catch (error: any) {
            this.logger.error('Error fetching break permissions:', error);
            throw error;
        }
    }

    /**
     * Get all break permissions for a specific employee
     */
    async getEmployeeBreakPermissions(employeeId: string): Promise<any[]> {
        try {
            const empOid = new Types.ObjectId(employeeId);

            const permissions = await this.exceptionModel.find({
                type: BREAK_PERMISSION_TYPE,
                employeeId: empOid,
            })
                .populate('attendanceRecordId')
                .sort({ createdAt: -1 })
                .lean();

            this.logger.log(`Retrieved ${permissions.length} break permissions for employee ${empOid}`);
            return permissions;

        } catch (error: any) {
            this.logger.error('Error fetching employee break permissions:', error);
            throw error;
        }
    }

    /**
     * Approve a break permission
     * This marks the break time as approved and it will be excluded from total work hours
     */
    async approveBreakPermission(permissionId: string, approvedBy: string): Promise<any> {
        try {
            const permId = new Types.ObjectId(permissionId);
            const approverOid = new Types.ObjectId(approvedBy);

            const permission = await this.exceptionModel.findById(permId);
            if (!permission) {
                throw new NotFoundException('Break permission not found');
            }

            if ((permission as any).type !== BREAK_PERMISSION_TYPE) {
                throw new BadRequestException('This is not a break permission');
            }

            // Update status to APPROVED
            permission.status = TimeExceptionStatus.APPROVED;
            (permission as any).approvedBy = approverOid;
            (permission as any).approvedAt = new Date();
            await permission.save();

            // Mark related attendance record as not finalised for payroll so it will be re-evaluated
            try {
                const att = await this.attendanceModel.findById((permission as any).attendanceRecordId);
                if (att) {
                    // Mark as not finalised and request recompute to fully apply approved break
                    att.finalisedForPayroll = false;
                    await att.save().catch(e => this.logger.warn('Failed to save attendance prior to recompute', e));

                    // Attendance will be updated by the attendance sync workflow or recompute; do not modify totalWorkMinutes here.
                }
            } catch (e) {
                this.logger.warn('Failed to mark attendance as not finalised after break approval', e);
            }

            // Create approval notification
            try {
                await this.notificationModel.create({
                    to: permission.employeeId,
                    type: 'BREAK_PERMISSION_APPROVED',
                    message: `Your break permission request has been approved. Duration: ${(permission as any).duration} minutes.`,
                    metadata: {
                        permissionId: permId.toString(),
                        status: 'APPROVED',
                        duration: (permission as any).duration,
                    },
                });
            } catch (e) {
                this.logger.warn('Failed to create approval notification', e);
            }

            this.logger.log(`✅ Break permission ${permId} approved`);
            return permission;

        } catch (error: any) {
            this.logger.error('Error approving break permission:', error);
            throw error;
        }
    }

    /**
     * Reject a break permission
     */
    async rejectBreakPermission(permissionId: string, rejectionReason: string): Promise<any> {
        try {
            const permId = new Types.ObjectId(permissionId);

            const permission = await this.exceptionModel.findById(permId);
            if (!permission) {
                throw new NotFoundException('Break permission not found');
            }

            if ((permission as any).type !== BREAK_PERMISSION_TYPE) {
                throw new BadRequestException('This is not a break permission');
            }

            // Update status to REJECTED
            permission.status = TimeExceptionStatus.REJECTED;
            (permission as any).rejectionReason = rejectionReason;
            (permission as any).rejectedAt = new Date();
            await permission.save();

            // Create rejection notification
            try {
                await this.notificationModel.create({
                    to: permission.employeeId,
                    type: 'BREAK_PERMISSION_REJECTED',
                    message: `Your break permission request has been rejected. Reason: ${rejectionReason}`,
                    metadata: {
                        permissionId: permId.toString(),
                        status: 'REJECTED',
                        reason: rejectionReason,
                    },
                });
            } catch (e) {
                this.logger.warn('Failed to create rejection notification', e);
            }

            this.logger.log(`❌ Break permission ${permId} rejected`);
            return permission;

        } catch (error: any) {
            this.logger.error('Error rejecting break permission:', error);
            throw error;
        }
    }

    /**
     * Delete a break permission by employee and permission ID
     * Only allows deletion of PENDING permissions
     */
    async deleteBreakPermission(employeeId: string, permissionId: string): Promise<{ message: string }> {
        try {
            const empOid = new Types.ObjectId(employeeId);
            const permId = new Types.ObjectId(permissionId);

            const permission = await this.exceptionModel.findById(permId);
            if (!permission) {
                throw new NotFoundException('Break permission not found');
            }

            // Verify it belongs to the employee
            if (permission.employeeId.toString() !== empOid.toString()) {
                throw new BadRequestException('This break permission does not belong to you');
            }

            if ((permission as any).type !== BREAK_PERMISSION_TYPE) {
                throw new BadRequestException('This is not a break permission');
            }

            // Only allow deletion of PENDING permissions
            if (permission.status !== TimeExceptionStatus.PENDING) {
                throw new BadRequestException(`Cannot delete ${permission.status} break permissions`);
            }

            // Remove from attendance record
            const attendanceRecord = await this.attendanceModel.findById(permission.attendanceRecordId);
            if (attendanceRecord) {
                attendanceRecord.exceptionIds = (attendanceRecord.exceptionIds || []).filter(
                    id => id.toString() !== permId.toString()
                );
                await attendanceRecord.save();
            }

            // Delete the permission
            await this.exceptionModel.findByIdAndDelete(permId);

            this.logger.log(`✅ Break permission ${permId} deleted by employee ${empOid}`);
            return { message: 'Break permission deleted successfully' };

        } catch (error: any) {
            this.logger.error('Error deleting break permission:', error);
            throw error;
        }
    }

    /**
     * Calculate total approved break minutes for an attendance record
     * This should be subtracted from total work minutes
     */
    async calculateApprovedBreakMinutes(attendanceRecordId: string): Promise<number> {
        try {
            const attRecordId = new Types.ObjectId(attendanceRecordId);

            const approvedBreaks = await this.exceptionModel.find({
                attendanceRecordId: attRecordId,
                type: BREAK_PERMISSION_TYPE,
                status: TimeExceptionStatus.APPROVED,
            }).lean();

            const totalBreakMinutes = approvedBreaks.reduce((sum, brk: any) => sum + (brk.duration || 0), 0);

            this.logger.debug(`Approved break minutes for attendance ${attRecordId}: ${totalBreakMinutes}`);
            return totalBreakMinutes;

        } catch (error: any) {
            this.logger.error('Error calculating approved break minutes:', error);
            return 0;
        }
    }



}
