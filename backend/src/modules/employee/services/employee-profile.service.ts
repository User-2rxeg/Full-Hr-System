import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmployeeProfile, EmployeeProfileDocument } from '../models/employee/employee-profile.schema';
import { EmployeeProfileChangeRequest, EmployeeProfileChangeRequestDocument } from '../models/employee/ep-change-request.schema';
import { EmployeeQualification, EmployeeQualificationDocument } from '../models/employee/qualification.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../models/employee/employee-system-role.schema';
import { EmployeeProfileAuditLog, EmployeeProfileAuditLogDocument, EmployeeProfileAuditAction } from '../models/audit/employee-profile-audit-log.schema';

import { UpdateContactInfoDto } from '../dto/employee-profile/update-contact-info.dto';
import { UpdateBioDto } from '../dto/employee-profile/update-bio.dto';
import { CreateCorrectionRequestDto } from '../dto/employee-profile/create-correction-request.dto';
import { AdminUpdateProfileDto } from '../dto/employee-profile/admin-update-profile.dto';
import { AdminAssignRoleDto } from '../dto/employee-profile/admin-assign-role.dto';
import { SearchEmployeesDto, PaginatedResult, PaginationQueryDto } from '../dto/employee-profile/search-employees.dto';
import { EmployeeStatus, ProfileChangeStatus } from '../enums/employee-profile.enums';
import { AddEmergencyContactDto, UpdateEmergencyContactDto } from '../dto/employee-profile/emergency-contact.dto';
import { AddQualificationDto, UpdateQualificationDto } from '../dto/employee-profile/qualification.dto';
import { SharedEmployeeService } from '../../shared/services/shared-employee.service';

@Injectable()
export class EmployeeProfileService {
    constructor(
        @InjectModel(EmployeeProfile.name)
        private employeeProfileModel: Model<EmployeeProfileDocument>,
        @InjectModel(EmployeeProfileChangeRequest.name)
        private changeRequestModel: Model<EmployeeProfileChangeRequestDocument>,
        @InjectModel(EmployeeSystemRole.name)
        private systemRoleModel: Model<EmployeeSystemRoleDocument>,
        @InjectModel(EmployeeQualification.name)
        private qualificationModel: Model<EmployeeQualificationDocument>,
        @InjectModel(EmployeeProfileAuditLog.name)
        private auditLogModel: Model<EmployeeProfileAuditLogDocument>,
        private readonly sharedEmployeeService: SharedEmployeeService,
    ) { }

    private validateObjectId(id: string, fieldName: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
        }
    }

    private createPaginatedResponse<T>(
        data: T[],
        total: number,
        page: number,
        limit: number
    ): PaginatedResult<T> {
        const totalPages = Math.ceil(total / limit);
        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }

    private readonly validStatusTransitions: Record<EmployeeStatus, EmployeeStatus[]> = {
        [EmployeeStatus.PROBATION]: [EmployeeStatus.ACTIVE, EmployeeStatus.TERMINATED],
        [EmployeeStatus.ACTIVE]: [EmployeeStatus.ON_LEAVE, EmployeeStatus.SUSPENDED, EmployeeStatus.INACTIVE, EmployeeStatus.RETIRED, EmployeeStatus.TERMINATED],
        [EmployeeStatus.ON_LEAVE]: [EmployeeStatus.ACTIVE, EmployeeStatus.TERMINATED],
        [EmployeeStatus.SUSPENDED]: [EmployeeStatus.ACTIVE, EmployeeStatus.TERMINATED],
        [EmployeeStatus.INACTIVE]: [EmployeeStatus.ACTIVE, EmployeeStatus.TERMINATED],
        [EmployeeStatus.RETIRED]: [EmployeeStatus.TERMINATED],
        [EmployeeStatus.TERMINATED]: [],
    };

    private isValidStatusTransition(currentStatus: EmployeeStatus, newStatus: EmployeeStatus): boolean {
        if (currentStatus === newStatus) return true;
        return this.validStatusTransitions[currentStatus]?.includes(newStatus) ?? false;
    }

    /**
     * BR 22: Log all profile modifications with timestamp and Actor's ID
     * Service-layer audit logging - does not modify schemas
     */
    private async logChange(params: {
        action: EmployeeProfileAuditAction;
        employeeProfileId: string;
        performedByEmployeeId?: string;
        summary?: string;
        fieldChanged?: string;
        before?: any;
        after?: any;
    }): Promise<void> {
        try {
            await this.auditLogModel.create({
                action: params.action,
                employeeProfileId: new Types.ObjectId(params.employeeProfileId),
                performedByEmployeeId: params.performedByEmployeeId ? new Types.ObjectId(params.performedByEmployeeId) : undefined,
                summary: params.summary,
                fieldChanged: params.fieldChanged,
                beforeSnapshot: params.before,
                afterSnapshot: params.after,
            });
        } catch (error) {
            // Log error but don't fail the operation
            console.error('[AUDIT LOG ERROR] Failed to log change:', error);
        }
    }

    async getProfile(userId: string): Promise<any> {
        this.validateObjectId(userId, 'userId');

        const profile = await this.employeeProfileModel.findById(userId)
            .populate('primaryPositionId')
            .populate('primaryDepartmentId')
            .populate('supervisorPositionId')
            .populate('lastAppraisalRecordId')
            .populate('lastAppraisalCycleId')
            .populate('lastAppraisalTemplateId')
            .populate('accessProfileId')
            .lean();

        if (!profile) {
            throw new NotFoundException('Employee profile not found');
        }

        const qualifications = await this.qualificationModel.find({ employeeProfileId: new Types.ObjectId(userId) }).lean();

        return { ...profile, education: qualifications };
    }

    async updateContactInfo(userId: string, dto: UpdateContactInfoDto): Promise<EmployeeProfile> {
        this.validateObjectId(userId, 'userId');

        const profile = await this.employeeProfileModel.findById(userId);
        if (!profile) {
            throw new NotFoundException('Employee profile not found');
        }

        if (profile.status === EmployeeStatus.TERMINATED) {
            throw new BadRequestException('Cannot update contact info for terminated employee');
        }

        // BR 22: Capture before snapshot for audit
        const beforeSnapshot = {
            mobilePhone: profile.mobilePhone,
            homePhone: profile.homePhone,
            personalEmail: profile.personalEmail,
            address: profile.address ? { ...profile.address } : undefined,
        };

        if (dto.mobilePhone !== undefined) profile.mobilePhone = dto.mobilePhone;
        if (dto.homePhone !== undefined) profile.homePhone = dto.homePhone;
        if (dto.personalEmail !== undefined) profile.personalEmail = dto.personalEmail;
        if (dto.address) {
            profile.address = { ...profile.address, ...dto.address };
        }

        const savedProfile = await profile.save();

        // BR 22: Log the change
        await this.logChange({
            action: EmployeeProfileAuditAction.CONTACT_INFO_UPDATED,
            employeeProfileId: userId,
            performedByEmployeeId: userId,
            summary: 'Contact information updated',
            before: beforeSnapshot,
            after: {
                mobilePhone: savedProfile.mobilePhone,
                homePhone: savedProfile.homePhone,
                personalEmail: savedProfile.personalEmail,
                address: savedProfile.address,
            },
        });

        await this.sharedEmployeeService.sendProfileUpdatedNotification(userId, profile.fullName || 'Employee');
        return savedProfile;
    }

    async updateBio(userId: string, dto: UpdateBioDto): Promise<EmployeeProfile> {
        this.validateObjectId(userId, 'userId');

        const profile = await this.employeeProfileModel.findById(userId);
        if (!profile) {
            throw new NotFoundException('Employee profile not found');
        }

        if (profile.status === EmployeeStatus.TERMINATED) {
            throw new BadRequestException('Cannot update bio for terminated employee');
        }

        // BR 22: Capture before snapshot for audit
        const beforeSnapshot = {
            biography: profile.biography,
            profilePictureUrl: profile.profilePictureUrl,
        };

        if (dto.biography !== undefined) profile.biography = dto.biography;
        if (dto.profilePictureUrl !== undefined) profile.profilePictureUrl = dto.profilePictureUrl;

        const savedProfile = await profile.save();

        // BR 22: Log the change
        await this.logChange({
            action: EmployeeProfileAuditAction.BIO_UPDATED,
            employeeProfileId: userId,
            performedByEmployeeId: userId,
            summary: 'Biography or profile picture updated',
            before: beforeSnapshot,
            after: {
                biography: savedProfile.biography,
                profilePictureUrl: savedProfile.profilePictureUrl,
            },
        });

        await this.sharedEmployeeService.sendProfileUpdatedNotification(userId, profile.fullName || 'Employee');
        return savedProfile;
    }

    async createCorrectionRequest(userId: string, dto: CreateCorrectionRequestDto): Promise<EmployeeProfileChangeRequest> {
        this.validateObjectId(userId, 'userId');

        const profile = await this.employeeProfileModel.findById(userId);
        if (!profile) {
            throw new NotFoundException('Employee profile not found');
        }

        if (profile.status === EmployeeStatus.TERMINATED) {
            throw new BadRequestException('Terminated employees cannot submit correction requests');
        }

        const existingPendingRequest = await this.changeRequestModel.findOne({
            employeeProfileId: new Types.ObjectId(userId),
            status: ProfileChangeStatus.PENDING,
        });

        if (existingPendingRequest) {
            throw new ConflictException(
                'You already have a pending correction request. Please wait for it to be processed or cancel it before submitting a new one.'
            );
        }

        const request = new this.changeRequestModel({
            requestId: `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            employeeProfileId: new Types.ObjectId(userId),
            requestDescription: dto.requestDescription,
            reason: dto.reason,
            status: ProfileChangeStatus.PENDING,
            submittedAt: new Date(),
        });

        const savedRequest = await request.save();

        // BR 22: Log the change request creation
        await this.logChange({
            action: EmployeeProfileAuditAction.CHANGE_REQUEST_CREATED,
            employeeProfileId: userId,
            performedByEmployeeId: userId,
            summary: `Change request created: ${dto.requestDescription}`,
        });

        await this.sharedEmployeeService.sendChangeRequestSubmittedNotification(userId, profile.fullName || 'Employee', savedRequest.requestId);
        return savedRequest;
    }

    async getMyChangeRequests(
        userId: string,
        queryDto: PaginationQueryDto
    ): Promise<PaginatedResult<EmployeeProfileChangeRequest>> {
        this.validateObjectId(userId, 'userId');

        const { page = 1, limit = 20 } = queryDto;
        const skip = (page - 1) * limit;

        const filter = { employeeProfileId: new Types.ObjectId(userId) };

        const [data, total] = await Promise.all([
            this.changeRequestModel
                .find(filter)
                .sort({ submittedAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.changeRequestModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data, total, page, limit);
    }

    async cancelMyChangeRequest(userId: string, requestId: string): Promise<EmployeeProfileChangeRequest> {
        this.validateObjectId(userId, 'userId');

        const request = await this.changeRequestModel.findOne({ requestId });

        if (!request) {
            throw new NotFoundException('Change request not found');
        }

        if (request.employeeProfileId.toString() !== userId) {
            throw new BadRequestException('You can only cancel your own change requests');
        }

        if (request.status !== ProfileChangeStatus.PENDING) {
            throw new BadRequestException(
                `Cannot cancel a request with status ${request.status}. Only PENDING requests can be canceled.`
            );
        }

        request.status = ProfileChangeStatus.CANCELED;
        request.processedAt = new Date();

        const savedRequest = await request.save();

        // BR 22: Log the cancellation
        await this.logChange({
            action: EmployeeProfileAuditAction.CHANGE_REQUEST_CANCELED,
            employeeProfileId: userId,
            performedByEmployeeId: userId,
            summary: `Change request ${requestId} canceled by employee`,
        });

        return savedRequest;
    }

    async getTeamProfiles(managerId: string): Promise<EmployeeProfile[]> {
        this.validateObjectId(managerId, 'managerId');

        const managerProfile = await this.employeeProfileModel.findById(managerId);
        if (!managerProfile) {
            throw new NotFoundException('Manager profile not found');
        }

        if (!managerProfile.primaryPositionId) {
            return [];
        }

        // BR 18b: Privacy filter - exclude sensitive info (mobilePhone, personalEmail, address, nationalId, bankAccountNumber)
        return this.employeeProfileModel.find({
            supervisorPositionId: managerProfile.primaryPositionId,
            status: { $ne: EmployeeStatus.TERMINATED },
        })
            .select('firstName lastName fullName employeeNumber primaryPositionId primaryDepartmentId workEmail status dateOfHire profilePictureUrl')
            .populate('primaryPositionId', 'title')
            .populate('primaryDepartmentId', 'name');
    }

    async getTeamProfilesPaginated(
        managerId: string,
        queryDto: PaginationQueryDto
    ): Promise<PaginatedResult<EmployeeProfile>> {
        this.validateObjectId(managerId, 'managerId');

        const { page = 1, limit = 20 } = queryDto;
        const skip = (page - 1) * limit;

        const managerProfile = await this.employeeProfileModel.findById(managerId);
        if (!managerProfile) {
            throw new NotFoundException('Manager profile not found');
        }

        if (!managerProfile.primaryPositionId) {
            return this.createPaginatedResponse([], 0, page, limit);
        }

        const filter = {
            supervisorPositionId: managerProfile.primaryPositionId,
            status: { $ne: EmployeeStatus.TERMINATED },
        };

        // BR 18b: Privacy filter - exclude sensitive info (mobilePhone, personalEmail, address, nationalId, bankAccountNumber)
        const [data, total] = await Promise.all([
            this.employeeProfileModel.find(filter)
                .select('firstName lastName fullName employeeNumber primaryPositionId primaryDepartmentId workEmail status dateOfHire profilePictureUrl')
                .populate('primaryPositionId', 'title')
                .populate('primaryDepartmentId', 'name')
                .skip(skip)
                .limit(limit)
                .exec(),
            this.employeeProfileModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data, total, page, limit);
    }

    async searchEmployees(
        queryDto: SearchEmployeesDto
    ): Promise<PaginatedResult<EmployeeProfile>> {
        const { query, status, departmentId, positionId, page = 1, limit = 20 } = queryDto;
        const skip = (page - 1) * limit;

        const searchFilter: any = {};

        if (query && query.trim()) {
            searchFilter.$or = [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { fullName: { $regex: query, $options: 'i' } },
                { workEmail: { $regex: query, $options: 'i' } },
                { employeeNumber: { $regex: query, $options: 'i' } },
                { nationalId: { $regex: query, $options: 'i' } },
            ];
        }

        if (status) {
            searchFilter.status = status;
        }
        if (departmentId) {
            this.validateObjectId(departmentId, 'departmentId');
            searchFilter.primaryDepartmentId = new Types.ObjectId(departmentId);
        }
        if (positionId) {
            this.validateObjectId(positionId, 'positionId');
            searchFilter.primaryPositionId = new Types.ObjectId(positionId);
        }

        const [data, total] = await Promise.all([
            this.employeeProfileModel.find(searchFilter)
                .populate('primaryPositionId', 'title')
                .populate('primaryDepartmentId', 'name')
                .select('firstName lastName fullName employeeNumber workEmail primaryPositionId primaryDepartmentId status dateOfHire')
                .sort({ lastName: 1, firstName: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.employeeProfileModel.countDocuments(searchFilter).exec(),
        ]);

        return this.createPaginatedResponse(data, total, page, limit);
    }

    async getAllEmployees(
        queryDto: SearchEmployeesDto
    ): Promise<PaginatedResult<EmployeeProfile>> {
        const { status, departmentId, positionId, page = 1, limit = 20 } = queryDto;
        const skip = (page - 1) * limit;

        const filter: any = {};

        if (status) {
            filter.status = status;
        }
        if (departmentId) {
            this.validateObjectId(departmentId, 'departmentId');
            filter.primaryDepartmentId = new Types.ObjectId(departmentId);
        }
        if (positionId) {
            this.validateObjectId(positionId, 'positionId');
            filter.primaryPositionId = new Types.ObjectId(positionId);
        }

        const [data, total] = await Promise.all([
            this.employeeProfileModel.find(filter)
                .populate('primaryPositionId', 'title')
                .populate('primaryDepartmentId', 'name')
                .select('firstName lastName fullName employeeNumber workEmail primaryPositionId primaryDepartmentId status dateOfHire contractType workType')
                .sort({ lastName: 1, firstName: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.employeeProfileModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data, total, page, limit);
    }

    async adminGetProfile(id: string): Promise<EmployeeProfile> {
        this.validateObjectId(id, 'id');

        const profile = await this.employeeProfileModel.findById(id)
            .populate('primaryPositionId')
            .populate('primaryDepartmentId')
            .populate('supervisorPositionId')
            .populate('lastAppraisalRecordId')
            .populate('lastAppraisalCycleId')
            .populate('lastAppraisalTemplateId')
            .populate('accessProfileId');

        if (!profile) {
            throw new NotFoundException('Employee profile not found');
        }
        return profile;
    }

    async adminUpdateProfile(id: string, dto: AdminUpdateProfileDto, adminUserId?: string): Promise<EmployeeProfile> {
        this.validateObjectId(id, 'id');

        const profile = await this.employeeProfileModel.findById(id);
        if (!profile) {
            throw new NotFoundException('Employee profile not found');
        }

        // BR 22: Capture before snapshot for audit
        const beforeSnapshot = profile.toObject();
        const oldStatus = profile.status;
        const oldPayGradeId = profile.payGradeId?.toString();

        if (dto.status && dto.status !== profile.status) {
            if (!this.isValidStatusTransition(profile.status, dto.status)) {
                throw new BadRequestException(
                    `Invalid status transition from ${profile.status} to ${dto.status}. ` +
                    (profile.status === EmployeeStatus.TERMINATED
                        ? 'TERMINATED is a terminal state and cannot be changed.'
                        : `Allowed transitions from ${profile.status}: ${this.validStatusTransitions[profile.status].join(', ') || 'none'}`)
                );
            }
        }

        if (dto.nationalId !== undefined && dto.nationalId !== profile.nationalId) {
            const existingWithNationalId = await this.employeeProfileModel.findOne({
                nationalId: dto.nationalId,
                _id: { $ne: new Types.ObjectId(id) }
            });
            if (existingWithNationalId) {
                throw new ConflictException('An employee with this national ID already exists');
            }
        }

        if (dto.workEmail !== undefined && dto.workEmail !== profile.workEmail) {
            const existingWithEmail = await this.employeeProfileModel.findOne({
                workEmail: dto.workEmail,
                _id: { $ne: new Types.ObjectId(id) }
            });
            if (existingWithEmail) {
                throw new ConflictException('An employee with this work email already exists');
            }
        }

        if (dto.firstName !== undefined) profile.firstName = dto.firstName;
        if (dto.middleName !== undefined) profile.middleName = dto.middleName;
        if (dto.lastName !== undefined) profile.lastName = dto.lastName;
        if (dto.firstName !== undefined || dto.middleName !== undefined || dto.lastName !== undefined) {
            profile.fullName = [dto.firstName || profile.firstName, dto.middleName || profile.middleName, dto.lastName || profile.lastName]
                .filter(Boolean)
                .join(' ');
        }
        if (dto.nationalId !== undefined) profile.nationalId = dto.nationalId;
        if (dto.gender !== undefined) profile.gender = dto.gender;
        if (dto.maritalStatus !== undefined) profile.maritalStatus = dto.maritalStatus;
        if (dto.dateOfBirth) profile.dateOfBirth = new Date(dto.dateOfBirth);

        if (dto.personalEmail !== undefined) profile.personalEmail = dto.personalEmail;
        if (dto.mobilePhone !== undefined) profile.mobilePhone = dto.mobilePhone;
        if (dto.homePhone !== undefined) profile.homePhone = dto.homePhone;
        if (dto.address) {
            profile.address = { ...profile.address, ...dto.address };
        }

        if (dto.biography !== undefined) profile.biography = dto.biography;
        if (dto.profilePictureUrl !== undefined) profile.profilePictureUrl = dto.profilePictureUrl;

        if (dto.primaryPositionId) {
            this.validateObjectId(dto.primaryPositionId, 'primaryPositionId');
            profile.primaryPositionId = new Types.ObjectId(dto.primaryPositionId);
        }
        if (dto.primaryDepartmentId) {
            this.validateObjectId(dto.primaryDepartmentId, 'primaryDepartmentId');
            profile.primaryDepartmentId = new Types.ObjectId(dto.primaryDepartmentId);
        }
        if (dto.supervisorPositionId) {
            this.validateObjectId(dto.supervisorPositionId, 'supervisorPositionId');
            profile.supervisorPositionId = new Types.ObjectId(dto.supervisorPositionId);
        }

        if (dto.status && dto.status !== oldStatus) {
            profile.status = dto.status;
            profile.statusEffectiveFrom = new Date();
        }

        if (dto.contractType !== undefined) profile.contractType = dto.contractType;
        if (dto.workType !== undefined) profile.workType = dto.workType;
        if (dto.dateOfHire) profile.dateOfHire = new Date(dto.dateOfHire);
        if (dto.contractStartDate) profile.contractStartDate = new Date(dto.contractStartDate);
        if (dto.contractEndDate) profile.contractEndDate = new Date(dto.contractEndDate);
        if (dto.workEmail !== undefined) profile.workEmail = dto.workEmail;

        if (dto.bankName !== undefined) profile.bankName = dto.bankName;
        if (dto.bankAccountNumber !== undefined) profile.bankAccountNumber = dto.bankAccountNumber;

        // Track pay grade change for payroll sync
        if (dto.payGradeId !== undefined) {
            this.validateObjectId(dto.payGradeId, 'payGradeId');
            profile.payGradeId = new Types.ObjectId(dto.payGradeId);
        }

        const savedProfile = await profile.save();

        // BR 22: Log the admin update
        const changedFields: string[] = [];
        if (dto.firstName !== undefined || dto.lastName !== undefined) changedFields.push('name');
        if (dto.status !== undefined && dto.status !== oldStatus) changedFields.push('status');
        if (dto.primaryPositionId !== undefined) changedFields.push('position');
        if (dto.primaryDepartmentId !== undefined) changedFields.push('department');
        if (dto.contractType !== undefined) changedFields.push('contractType');
        if (dto.payGradeId !== undefined) changedFields.push('payGrade');

        await this.logChange({
            action: EmployeeProfileAuditAction.UPDATED,
            employeeProfileId: id,
            performedByEmployeeId: adminUserId,
            summary: `Admin updated profile: ${changedFields.join(', ') || 'various fields'}`,
            fieldChanged: changedFields.length === 1 ? changedFields[0] : undefined,
            before: beforeSnapshot,
            after: savedProfile.toObject(),
        });

        // Log status change separately if applicable and sync with payroll
        if (dto.status && dto.status !== oldStatus) {
            await this.logChange({
                action: EmployeeProfileAuditAction.STATUS_CHANGED,
                employeeProfileId: id,
                performedByEmployeeId: adminUserId,
                summary: `Status changed from ${oldStatus} to ${dto.status}`,
                fieldChanged: 'status',
                before: { status: oldStatus },
                after: { status: dto.status },
            });
            await this.sharedEmployeeService.syncEmployeeStatusToPayroll(id, dto.status, profile.fullName || 'Employee');
        }

        // Sync pay grade changes with payroll
        if (dto.payGradeId !== undefined && dto.payGradeId !== oldPayGradeId) {
            await this.sharedEmployeeService.syncPayGradeChange(id, profile.fullName || 'Employee', dto.payGradeId);
        }

        await this.sharedEmployeeService.sendProfileUpdatedNotification(id, profile.fullName || 'Employee');

        return savedProfile;
    }

    async adminDeactivateEmployee(id: string, adminUserId?: string): Promise<EmployeeProfile> {
        this.validateObjectId(id, 'id');

        const profile = await this.employeeProfileModel.findById(id);
        if (!profile) {
            throw new NotFoundException('Employee profile not found');
        }

        if (profile.status === EmployeeStatus.TERMINATED) {
            throw new BadRequestException('Employee is already terminated');
        }

        await this.changeRequestModel.updateMany(
            {
                employeeProfileId: new Types.ObjectId(id),
                status: ProfileChangeStatus.PENDING,
            },
            {
                $set: {
                    status: ProfileChangeStatus.CANCELED,
                    processedAt: new Date(),
                },
            }
        );

        // BR 22: Capture before snapshot
        const beforeStatus = profile.status;

        profile.status = EmployeeStatus.TERMINATED;
        profile.statusEffectiveFrom = new Date();

        const savedProfile = await profile.save();

        // BR 22: Log the deactivation
        await this.logChange({
            action: EmployeeProfileAuditAction.DEACTIVATED,
            employeeProfileId: id,
            performedByEmployeeId: adminUserId,
            summary: `Employee deactivated (status changed to TERMINATED)`,
            fieldChanged: 'status',
            before: { status: beforeStatus },
            after: { status: EmployeeStatus.TERMINATED },
        });

        await this.sharedEmployeeService.syncEmployeeStatusToPayroll(id, EmployeeStatus.TERMINATED, profile.fullName || 'Employee');
        await this.sharedEmployeeService.sendProfileUpdatedNotification(id, profile.fullName || 'Employee');

        return savedProfile;
    }

    async adminAssignRole(id: string, dto: AdminAssignRoleDto, adminUserId?: string): Promise<EmployeeProfile> {
        this.validateObjectId(id, 'id');

        const profile = await this.employeeProfileModel.findById(id);
        if (!profile) {
            throw new NotFoundException('Employee profile not found');
        }

        if (profile.status === EmployeeStatus.TERMINATED) {
            throw new BadRequestException('Cannot assign role to terminated employee');
        }

        if (profile.status === EmployeeStatus.SUSPENDED) {
            throw new BadRequestException('Cannot assign role to suspended employee');
        }

        // If roles array is provided, create/update EmployeeSystemRole
        if (dto.roles && dto.roles.length > 0) {
            // BR 22: Capture before snapshot
            const beforeRoles = profile.accessProfileId ?
                (await this.systemRoleModel.findById(profile.accessProfileId))?.roles || [] : [];

            // Find or create the EmployeeSystemRole document
            let systemRole = await this.systemRoleModel.findOne({
                employeeProfileId: new Types.ObjectId(id)
            });

            if (systemRole) {
                // Update existing role document
                systemRole.roles = dto.roles;
                systemRole.isActive = true;
                await systemRole.save();
            } else {
                // Create new role document
                systemRole = await this.systemRoleModel.create({
                    employeeProfileId: new Types.ObjectId(id),
                    roles: dto.roles,
                    permissions: [],
                    isActive: true,
                });
            }

            // Update the employee profile with the accessProfileId
            profile.accessProfileId = systemRole._id as Types.ObjectId;
            const savedProfile = await profile.save();

            // BR 22: Log the role assignment
            await this.logChange({
                action: EmployeeProfileAuditAction.ROLE_ASSIGNED,
                employeeProfileId: id,
                performedByEmployeeId: adminUserId,
                summary: `Roles assigned: ${dto.roles.join(', ')}`,
                fieldChanged: 'roles',
                before: { roles: beforeRoles },
                after: { roles: dto.roles },
            });

            return savedProfile;
        }

        // If accessProfileId is provided, use it directly
        if (dto.accessProfileId) {
            this.validateObjectId(dto.accessProfileId, 'accessProfileId');

            const role = await this.systemRoleModel.findById(dto.accessProfileId);
            if (!role) {
                throw new NotFoundException('System role not found');
            }

            if (!role.isActive) {
                throw new BadRequestException('Cannot assign an inactive role');
            }

            profile.accessProfileId = new Types.ObjectId(dto.accessProfileId);
            return profile.save();
        }

        throw new BadRequestException('Either roles array or accessProfileId must be provided');
    }

    async getChangeRequests(
        status?: ProfileChangeStatus,
        page: number = 1,
        limit: number = 20
    ): Promise<PaginatedResult<EmployeeProfileChangeRequest>> {
        const skip = (page - 1) * limit;
        const filter = status ? { status } : {};

        const [data, total] = await Promise.all([
            this.changeRequestModel.find(filter)
                .populate('employeeProfileId', 'firstName lastName fullName employeeNumber workEmail')
                .sort({ submittedAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.changeRequestModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data, total, page, limit);
    }

    async getChangeRequestById(requestId: string): Promise<EmployeeProfileChangeRequest> {
        const request = await this.changeRequestModel.findOne({ requestId })
            .populate('employeeProfileId', 'firstName lastName fullName employeeNumber workEmail primaryDepartmentId primaryPositionId');

        if (!request) {
            throw new NotFoundException('Change request not found');
        }

        return request;
    }

    async processChangeRequest(
        requestId: string,
        status: ProfileChangeStatus.APPROVED | ProfileChangeStatus.REJECTED,
        adminUserId?: string,
        rejectionReason?: string,
        proposedChanges?: Record<string, any>
    ): Promise<EmployeeProfileChangeRequest> {
        try {
            // Find request without population to avoid nested validation issues on save
            const request = await this.changeRequestModel.findOne({ requestId });

            if (!request) {
                throw new NotFoundException('Change request not found');
            }

            request.status = status;
            request.processedAt = new Date();
            if (adminUserId) {
                request.processedBy = new Types.ObjectId(adminUserId);
            }

            if (rejectionReason) {
                request.rejectionReason = rejectionReason;
            }

            // Store proposed changes if provided
            if (proposedChanges) {
                request.set('proposedChanges', proposedChanges);
                request.markModified('proposedChanges');
            }

            // Auto-apply changes if approved and proposedChanges provided
            if (status === ProfileChangeStatus.APPROVED && proposedChanges && Object.keys(proposedChanges).length > 0) {
                const targetProfileId = request.employeeProfileId?.toString();

                if (targetProfileId) {
                    await this.applyChangeRequestToProfile(targetProfileId, proposedChanges);
                }
            }

            const savedRequest = await request.save();

            // BR 22: Log the change request processing
            if (request.employeeProfileId) {
                const profileId = request.employeeProfileId.toString();
                const action = status === ProfileChangeStatus.APPROVED
                    ? EmployeeProfileAuditAction.CHANGE_REQUEST_APPROVED
                    : EmployeeProfileAuditAction.CHANGE_REQUEST_REJECTED;

                await this.logChange({
                    action,
                    employeeProfileId: profileId,
                    performedByEmployeeId: adminUserId,
                    summary: `Change request ${requestId} ${status.toLowerCase()}${rejectionReason ? `: ${rejectionReason}` : ''}`,
                });

                await this.sharedEmployeeService.sendChangeRequestProcessedNotification(
                    profileId,
                    requestId,
                    status,
                    rejectionReason
                );
            }

            return savedRequest;
        } catch (error) {
            console.error('[ERROR] processChangeRequest failed:', error);
            throw error;
        }
    }

    /**
     * Apply approved changes to employee profile
     * Only allows updating specific safe fields
     */
    private async applyChangeRequestToProfile(
        employeeId: string,
        changes: Record<string, any>
    ): Promise<void> {
        const allowedFields = [
            // Contact Information
            'mobilePhone',
            'homePhone',
            'personalEmail',
            'address.city',
            'address.streetAddress',
            'address.country',
            'address', // For full address object
            // Personal Information
            'biography',
            'profilePictureUrl',
            // Banking (if allowed by policy)
            'bankName',
            'bankAccountNumber',
        ];

        const profile = await this.employeeProfileModel.findById(employeeId);
        if (!profile) return;

        let hasChanges = false;

        for (const [field, value] of Object.entries(changes)) {
            if (!allowedFields.includes(field)) continue;

            // Handle nested address fields
            if (field.startsWith('address.')) {
                if (!profile.address) {
                    profile.address = {} as any;
                }
                const subField = field.split('.')[1];
                (profile.address as any)[subField] = value;
                profile.markModified('address');
                hasChanges = true;
            } else {
                // Handle top-level fields
                profile.set(field, value);
                hasChanges = true;
            }
        }

        if (hasChanges) {
            await profile.save();

            // Send notification about profile update
            await this.sharedEmployeeService.sendProfileUpdatedNotification(
                employeeId,
                profile.fullName || 'Employee'
            );
        }
    }

    async getEmployeeCountByStatus(): Promise<Record<string, number>> {
        const counts = await this.employeeProfileModel.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        const result: Record<string, number> = {};
        for (const item of counts) {
            result[item._id] = item.count;
        }
        return result;
    }

    async getEmployeeCountByDepartment(): Promise<any[]> {
        return this.employeeProfileModel.aggregate([
            {
                $match: { status: { $ne: EmployeeStatus.TERMINATED } },
            },
            {
                $group: {
                    _id: '$primaryDepartmentId',
                    count: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'departments',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'department',
                },
            },
            {
                $unwind: { path: '$department', preserveNullAndEmptyArrays: true },
            },
            {
                $project: {
                    departmentId: '$_id',
                    departmentName: '$department.name',
                    count: 1,
                },
            },
            {
                $sort: { count: -1 },
            },
        ]);
    }

    async getPendingChangeRequestsCount(): Promise<number> {
        return this.changeRequestModel.countDocuments({ status: ProfileChangeStatus.PENDING });
    }

    // =============================================
    // Emergency Contact Management
    // =============================================

    async getEmergencyContacts(userId: string): Promise<any[]> {
        this.validateObjectId(userId, 'userId');

        const profile = await this.employeeProfileModel.findById(userId).select('emergencyContacts');
        if (!profile) {
            throw new NotFoundException('Employee profile not found');
        }

        return profile.emergencyContacts || [];
    }

    async addEmergencyContact(userId: string, contactData: AddEmergencyContactDto): Promise<any> {
        this.validateObjectId(userId, 'userId');

        const profile = await this.employeeProfileModel.findById(userId);
        if (!profile) {
            throw new NotFoundException('Employee profile not found');
        }

        if (profile.status === EmployeeStatus.TERMINATED) {
            throw new BadRequestException('Cannot add emergency contact for terminated employee');
        }

        // If marking as primary, unmark all others
        if (contactData.isPrimary) {
            profile.emergencyContacts = profile.emergencyContacts?.map(contact => ({
                ...contact,
                isPrimary: false
            })) || [];
        }

        // Add new contact
        const newContact = {
            name: contactData.name,
            relationship: contactData.relationship,
            phone: contactData.phone,
            email: contactData.email,
            isPrimary: contactData.isPrimary || false
        };

        profile.emergencyContacts = [...(profile.emergencyContacts || []), newContact];
        await profile.save();

        return profile.emergencyContacts;
    }

    async updateEmergencyContact(userId: string, contactIndex: number, updateData: UpdateEmergencyContactDto): Promise<any> {
        this.validateObjectId(userId, 'userId');

        const profile = await this.employeeProfileModel.findById(userId);
        if (!profile) {
            throw new NotFoundException('Employee profile not found');
        }

        if (profile.status === EmployeeStatus.TERMINATED) {
            throw new BadRequestException('Cannot update emergency contact for terminated employee');
        }

        if (!profile.emergencyContacts || contactIndex >= profile.emergencyContacts.length) {
            throw new NotFoundException('Emergency contact not found');
        }

        // If marking as primary, unmark all others
        if (updateData.isPrimary) {
            profile.emergencyContacts = profile.emergencyContacts.map((contact, idx) => ({
                ...contact,
                isPrimary: idx === contactIndex
            }));
        }

        // Update the contact
        profile.emergencyContacts[contactIndex] = {
            ...profile.emergencyContacts[contactIndex],
            ...updateData
        };

        await profile.save();
        return profile.emergencyContacts;
    }

    async deleteEmergencyContact(userId: string, contactIndex: number): Promise<any> {
        this.validateObjectId(userId, 'userId');

        const profile = await this.employeeProfileModel.findById(userId);
        if (!profile) {
            throw new NotFoundException('Employee profile not found');
        }

        if (!profile.emergencyContacts || contactIndex >= profile.emergencyContacts.length) {
            throw new NotFoundException('Emergency contact not found');
        }

        profile.emergencyContacts.splice(contactIndex, 1);
        await profile.save();

        return profile.emergencyContacts;
    }

    // =============================================
    // Qualification Management
    // =============================================

    async getQualifications(userId: string): Promise<any[]> {
        this.validateObjectId(userId, 'userId');
        return this.qualificationModel.find({ employeeProfileId: new Types.ObjectId(userId) }).lean();
    }

    async addQualification(userId: string, dto: AddQualificationDto): Promise<any> {
        this.validateObjectId(userId, 'userId');

        const qualification = new this.qualificationModel({
            ...dto,
            employeeProfileId: new Types.ObjectId(userId)
        });

        await qualification.save();
        return this.getQualifications(userId);
    }

    async updateQualification(userId: string, qualificationId: string, dto: UpdateQualificationDto): Promise<any> {
        this.validateObjectId(userId, 'userId');
        this.validateObjectId(qualificationId, 'qualificationId');

        const qualification = await this.qualificationModel.findOneAndUpdate(
            { _id: new Types.ObjectId(qualificationId), employeeProfileId: new Types.ObjectId(userId) },
            { $set: dto },
            { new: true }
        );

        if (!qualification) {
            throw new NotFoundException('Qualification not found');
        }

        return this.getQualifications(userId);
    }

    async deleteQualification(userId: string, qualificationId: string): Promise<any> {
        this.validateObjectId(userId, 'userId');
        this.validateObjectId(qualificationId, 'qualificationId');

        const result = await this.qualificationModel.deleteOne({
            _id: new Types.ObjectId(qualificationId),
            employeeProfileId: new Types.ObjectId(userId)
        });

        if (result.deletedCount === 0) {
            throw new NotFoundException('Qualification not found');
        }

        return this.getQualifications(userId);
    }
}
