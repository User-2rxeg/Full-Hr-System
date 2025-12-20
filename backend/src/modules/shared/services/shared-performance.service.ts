import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { NotificationLog, NotificationLogDocument } from '../../time-management/models/notification-log.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../../employee/models/employee/employee-system-role.schema';
import { SystemRole, EmployeeStatus } from '../../employee/enums/employee-profile.enums';

@Injectable()
export class SharedPerformanceService {
    private readonly logger = new Logger(SharedPerformanceService.name);

    constructor(
        @InjectModel(NotificationLog.name) private notificationModel: Model<NotificationLogDocument>,
        @InjectModel(EmployeeProfile.name) private employeeProfileModel: Model<EmployeeProfileDocument>,
        @InjectModel(EmployeeSystemRole.name) private systemRoleModel: Model<EmployeeSystemRoleDocument>,
    ) {}

    private validateObjectId(id: string, fieldName: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
        }
    }

    private async createNotification(to: Types.ObjectId | string, type: string, message: string): Promise<NotificationLog> {
        const toId = typeof to === 'string' ? new Types.ObjectId(to) : to;
        const notification = new this.notificationModel({ to: toId, type, message });
        return notification.save();
    }

    private async findUsersByRoles(roles: SystemRole[]): Promise<any[]> {
        try {
            const systemRoles = await this.systemRoleModel.find({ roles: { $in: roles }, isActive: true }).exec();
            if (!systemRoles.length) return [];
            const employeeIds = systemRoles.map(r => r.employeeProfileId);
            const employees = await this.employeeProfileModel.find({
                _id: { $in: employeeIds },
                status: { $ne: EmployeeStatus.TERMINATED },
            }).select('_id').exec();
            return systemRoles
                .map(role => {
                    const emp = employees.find(e => e._id.toString() === role.employeeProfileId?.toString());
                    return emp ? { employeeProfileId: role.employeeProfileId } : null;
                })
                .filter(Boolean);
        } catch (error) {
            this.logger.error('Failed to find users by roles', error);
            return [];
        }
    }

    private async notifyHRUsers(type: string, message: string): Promise<void> {
        const hrUsers = await this.findUsersByRoles([SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.HR_EMPLOYEE]);
        for (const user of hrUsers) {
            await this.createNotification(user.employeeProfileId, type, message);
        }
    }

    async sendAppraisalAssignedNotification(employeeId: string, managerId: string, employeeName: string, cycleName: string, dueDate?: Date): Promise<void> {
        const dueDateStr = dueDate ? ` Due by: ${dueDate.toISOString().slice(0, 10)}` : '';
        await this.createNotification(employeeId, 'APPRAISAL_ASSIGNED', `You have been assigned an appraisal for cycle "${cycleName}".${dueDateStr}`);
        await this.createNotification(managerId, 'APPRAISAL_TO_COMPLETE', `You need to complete an appraisal for ${employeeName} in cycle "${cycleName}".${dueDateStr}`);
    }

    async sendAppraisalPublishedNotification(employeeId: string, cycleName: string, overallRating: string): Promise<void> {
        await this.createNotification(employeeId, 'N-022', `Your appraisal for cycle "${cycleName}" has been published. Overall rating: ${overallRating}. Please review and acknowledge.`);
    }

    async sendAppraisalReminderNotification(managerId: string, pendingCount: number, cycleName: string): Promise<void> {
        await this.createNotification(managerId, 'APPRAISAL_REMINDER', `You have ${pendingCount} pending appraisal(s) for cycle "${cycleName}". Please complete them before the deadline.`);
    }

    async sendDisputeFiledNotification(employeeId: string, employeeName: string, disputeId: string): Promise<void> {
        await this.createNotification(employeeId, 'DISPUTE_FILED', `Your appraisal dispute has been submitted for review.`);
        await this.notifyHRUsers('DISPUTE_FILED', `Employee ${employeeName} has filed an appraisal dispute (ID: ${disputeId}).`);
    }

    async sendDisputeResolvedNotification(employeeId: string, disputeId: string, status: string, resolutionSummary: string): Promise<void> {
        await this.createNotification(employeeId, 'DISPUTE_RESOLVED', `Your appraisal dispute has been ${status.toLowerCase()}. ${resolutionSummary}`);
    }

    async updateEmployeeLastAppraisal(employeeId: string, appraisalRecordId: string, cycleId: string, templateId: string): Promise<void> {
        this.validateObjectId(employeeId, 'employeeId');
        this.validateObjectId(appraisalRecordId, 'appraisalRecordId');
        this.validateObjectId(cycleId, 'cycleId');
        this.validateObjectId(templateId, 'templateId');
        await this.employeeProfileModel.findByIdAndUpdate(employeeId, {
            lastAppraisalRecordId: new Types.ObjectId(appraisalRecordId),
            lastAppraisalCycleId: new Types.ObjectId(cycleId),
            lastAppraisalTemplateId: new Types.ObjectId(templateId),
        });
    }

    async getManagerForEmployee(employeeId: string): Promise<string | null> {
        this.validateObjectId(employeeId, 'employeeId');
        const employee = await this.employeeProfileModel.findById(employeeId).select('supervisorPositionId').exec();
        if (!employee?.supervisorPositionId) return null;
        const manager = await this.employeeProfileModel.findOne({
            primaryPositionId: employee.supervisorPositionId,
            status: { $ne: EmployeeStatus.TERMINATED },
        }).select('_id').exec();
        return manager?._id?.toString() || null;
    }

    async getEmployeeProfile(employeeId: string): Promise<{ fullName: string; employeeNumber: string } | null> {
        this.validateObjectId(employeeId, 'employeeId');
        const employee = await this.employeeProfileModel.findById(employeeId).select('fullName employeeNumber').exec();
        if (!employee) return null;
        return { fullName: employee.fullName || '', employeeNumber: employee.employeeNumber || '' };
    }
}
