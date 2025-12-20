import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { NotificationLog, NotificationLogDocument } from '../../time-management/models/notification-log.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../../employee/models/employee/employee-system-role.schema';
import { SystemRole, EmployeeStatus } from '../../employee/enums/employee-profile.enums';

@Injectable()
export class SharedOrganizationService {
    private readonly logger = new Logger(SharedOrganizationService.name);

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

    async sendStructureChangeNotification(changeType: string, targetName: string, affectedEmployeeIds?: string[]): Promise<void> {
        await this.notifyHRUsers('ORG_STRUCTURE_CHANGED', `Organization structure update: ${changeType} - ${targetName}`);
        if (affectedEmployeeIds && affectedEmployeeIds.length > 0) {
            for (const empId of affectedEmployeeIds) {
                await this.createNotification(empId, 'ORG_STRUCTURE_CHANGED', `Your organizational assignment has been updated: ${changeType}`);
            }
        }
    }

    async updateEmployeePrimaryPosition(employeeId: string, positionId: string, departmentId: string): Promise<void> {
        this.validateObjectId(employeeId, 'employeeId');
        this.validateObjectId(positionId, 'positionId');
        this.validateObjectId(departmentId, 'departmentId');
        await this.employeeProfileModel.findByIdAndUpdate(employeeId, {
            primaryPositionId: new Types.ObjectId(positionId),
            primaryDepartmentId: new Types.ObjectId(departmentId),
        });
    }

    async clearEmployeePrimaryPosition(employeeId: string): Promise<void> {
        this.validateObjectId(employeeId, 'employeeId');
        await this.employeeProfileModel.findByIdAndUpdate(employeeId, {
            $unset: { primaryPositionId: 1 }
        });
    }

    async updateEmployeeSupervisor(employeeId: string, supervisorPositionId: string): Promise<void> {
        this.validateObjectId(employeeId, 'employeeId');
        this.validateObjectId(supervisorPositionId, 'supervisorPositionId');
        await this.employeeProfileModel.findByIdAndUpdate(employeeId, {
            supervisorPositionId: new Types.ObjectId(supervisorPositionId),
        });
    }

    async getEmployeesByPosition(positionId: string): Promise<string[]> {
        this.validateObjectId(positionId, 'positionId');
        const employees = await this.employeeProfileModel.find({
            primaryPositionId: new Types.ObjectId(positionId),
            status: { $ne: EmployeeStatus.TERMINATED },
        }).select('_id').exec();
        return employees.map(e => e._id.toString());
    }

    async getEmployeesBySupervisorPosition(supervisorPositionId: string): Promise<string[]> {
        this.validateObjectId(supervisorPositionId, 'supervisorPositionId');
        const employees = await this.employeeProfileModel.find({
            supervisorPositionId: new Types.ObjectId(supervisorPositionId),
            status: { $ne: EmployeeStatus.TERMINATED },
        }).select('_id').exec();
        return employees.map(e => e._id.toString());
    }

    async getEmployeesByDepartment(departmentId: string): Promise<string[]> {
        this.validateObjectId(departmentId, 'departmentId');
        const employees = await this.employeeProfileModel.find({
            primaryDepartmentId: new Types.ObjectId(departmentId),
            status: { $ne: EmployeeStatus.TERMINATED },
        }).select('_id').exec();
        return employees.map(e => e._id.toString());
    }

    async notifyStructureChangeRequestSubmitted(requestId: string, requesterName: string, changeType: string, targetName: string): Promise<void> {
        await this.notifyHRUsers('STRUCTURE_CHANGE_REQUEST', `${requesterName} submitted a ${changeType} request for ${targetName} (Request ID: ${requestId}).`);
    }

    async notifyStructureChangeRequestProcessed(requesterId: string, requestId: string, status: string, comments?: string): Promise<void> {
        const commentStr = comments ? ` Comments: ${comments}` : '';
        const message = status === 'APPROVED'
            ? `Your structure change request (${requestId}) has been approved.${commentStr}`
            : `Your structure change request (${requestId}) has been rejected.${commentStr}`;
        await this.createNotification(requesterId, 'STRUCTURE_CHANGE_PROCESSED', message);
    }
}

