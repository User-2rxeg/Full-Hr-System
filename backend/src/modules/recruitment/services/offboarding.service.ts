import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// Models
import { TerminationRequest, TerminationRequestDocument } from '../models/termination-request.schema';
import { ClearanceChecklist, ClearanceChecklistDocument } from '../models/clearance-checklist.schema';
import { Contract, ContractDocument } from '../models/contract.schema';

// Payroll Models
import { EmployeeTerminationResignation, EmployeeTerminationResignationDocument } from '../../payroll/payroll-execution/models/EmployeeTerminationResignation.schema';
import { terminationAndResignationBenefits, terminationAndResignationBenefitsDocument } from '../../payroll/payroll-configuration/models/terminationAndResignationBenefits';
import { BenefitStatus } from '../../payroll/payroll-execution/enums/payroll-execution-enum';

// Payroll Service
import { PayrollExecutionService } from '../../payroll/payroll-execution/services/payroll-execution.service';

// Leaves Models
import { LeaveEntitlement, LeaveEntitlementDocument } from '../../leaves/models/leave-entitlement.schema';
import { LeaveRequest, LeaveRequestDocument } from '../../leaves/models/leave-request.schema';
import { LeaveType, LeaveTypeDocument } from '../../leaves/models/leave-type.schema';
import { LeaveStatus } from '../../leaves/enums/leave-status.enum';

// Employee Models
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee/models/employee/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../../employee/models/employee/employee-system-role.schema';
import { payGrade, payGradeDocument } from '../../payroll/payroll-configuration/models/payGrades.schema';
import { EmployeeStatus } from '../../employee/enums/employee-profile.enums';

// DTOs
import {
    CreateTerminationRequestDto,
    CreateResignationRequestDto,
    UpdateTerminationStatusDto,
    CreateClearanceChecklistDto,
    UpdateClearanceItemDto,
    UpdateEquipmentItemDto,
    RevokeAccessDto,
    TriggerFinalSettlementDto,
} from '../dto/offboarding';

// Enums
import { TerminationInitiation } from '../enums/termination-initiation.enum';
import { TerminationStatus } from '../enums/termination-status.enum';
import { ApprovalStatus } from '../enums/approval-status.enum';

// Shared Services
import { SharedRecruitmentService } from '../../shared/services/shared-recruitment.service';

@Injectable()
export class OffboardingService {
    private readonly logger = new Logger(OffboardingService.name);

    constructor(
        @InjectModel(TerminationRequest.name) private terminationRequestModel: Model<TerminationRequestDocument>,
        @InjectModel(ClearanceChecklist.name) private clearanceChecklistModel: Model<ClearanceChecklistDocument>,
        @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
        // Payroll Models
        @InjectModel(EmployeeTerminationResignation.name) private employeeTerminationResignationModel: Model<EmployeeTerminationResignationDocument>,
        @InjectModel(terminationAndResignationBenefits.name) private terminationBenefitsModel: Model<terminationAndResignationBenefitsDocument>,
        // Leaves Models
        @InjectModel(LeaveEntitlement.name) private leaveEntitlementModel: Model<LeaveEntitlementDocument>,
        @InjectModel(LeaveRequest.name) private leaveRequestModel: Model<LeaveRequestDocument>,
        @InjectModel(LeaveType.name) private leaveTypeModel: Model<LeaveTypeDocument>,
        // Employee Models
        @InjectModel(EmployeeProfile.name) private employeeProfileModel: Model<EmployeeProfileDocument>,
        @InjectModel(EmployeeSystemRole.name) private employeeSystemRoleModel: Model<EmployeeSystemRoleDocument>,
        @InjectModel(payGrade.name) private payGradeModel: Model<payGradeDocument>,
        // Services
        @Inject(forwardRef(() => PayrollExecutionService)) private readonly payrollExecutionService: PayrollExecutionService,
        private readonly sharedRecruitmentService: SharedRecruitmentService,
    ) {}


    private validateObjectId(id: string, fieldName: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
        }
    }

    /**
     * Normalize approval status to handle case-insensitive comparison
     * DB might store 'APPROVED', 'Approved', or 'approved'
     */
    private normalizeApprovalStatus(status: string | undefined): ApprovalStatus {
        if (!status) return ApprovalStatus.PENDING;
        const lower = status.toLowerCase();
        if (lower === 'approved') return ApprovalStatus.APPROVED;
        if (lower === 'rejected') return ApprovalStatus.REJECTED;
        return ApprovalStatus.PENDING;
    }

    /**
     * Normalize all clearance checklist item statuses before saving
     * Fixes case mismatch between DB data (uppercase) and schema enum (lowercase)
     */
    private normalizeAllClearanceItemStatuses(checklist: ClearanceChecklistDocument): void {
        if (checklist.items && Array.isArray(checklist.items)) {
            for (let i = 0; i < checklist.items.length; i++) {
                if (checklist.items[i].status) {
                    checklist.items[i].status = this.normalizeApprovalStatus(checklist.items[i].status);
                }
            }
        }
    }

    /**
     * Normalize termination status to handle case-insensitive comparison
     * DB might store 'UNDER_REVIEW', 'Under_Review', or 'under_review'
     */
    private normalizeTerminationStatus(status: string | undefined): TerminationStatus {
        if (!status) return TerminationStatus.PENDING;
        const lower = status.toLowerCase();
        if (lower === 'approved') return TerminationStatus.APPROVED;
        if (lower === 'rejected') return TerminationStatus.REJECTED;
        if (lower === 'under_review') return TerminationStatus.UNDER_REVIEW;
        return TerminationStatus.PENDING;
    }

    /**
     * Normalize termination initiator to handle case-insensitive comparison
     * DB might store 'MANAGER', 'Manager', or 'manager'
     */
    private normalizeTerminationInitiator(initiator: string | undefined): TerminationInitiation {
        if (!initiator) return TerminationInitiation.HR;
        const lower = initiator.toLowerCase();
        if (lower === 'employee') return TerminationInitiation.EMPLOYEE;
        if (lower === 'manager') return TerminationInitiation.MANAGER;
        return TerminationInitiation.HR;
    }

    /**
     * Normalize all fields in a termination request before saving
     */
    private normalizeTerminationRequest(request: TerminationRequestDocument): void {
        if (request.status) {
            request.status = this.normalizeTerminationStatus(request.status);
        }
        if (request.initiator) {
            request.initiator = this.normalizeTerminationInitiator(request.initiator);
        }
    }

    private readonly validStatusTransitions: Record<TerminationStatus, TerminationStatus[]> = {
        [TerminationStatus.PENDING]: [TerminationStatus.UNDER_REVIEW, TerminationStatus.REJECTED],
        [TerminationStatus.UNDER_REVIEW]: [TerminationStatus.APPROVED, TerminationStatus.REJECTED],
        [TerminationStatus.APPROVED]: [],
        [TerminationStatus.REJECTED]: [],
    };

    // ============================================================
    // OFF-001: Get Employee Performance Summary for Termination Review
    // HR Manager reviews performance data before initiating termination
    // ============================================================

    /**
     * OFF-001: Get employee performance summary for termination review
     * Returns performance data from Performance Management module
     * Helps HR Manager make informed decision about termination
     */
    async getEmployeePerformanceForTermination(employeeId: string): Promise<{
        employeeId: string;
        employeeName: string;
        employeeStatus: string;
        performanceData: {
            hasPublishedAppraisals: boolean;
            totalAppraisals: number;
            averageScore: number | null;
            lowScoreCount: number;
            latestAppraisal?: {
                cycleId?: any;
                totalScore?: number;
                publishedAt?: Date;
            };
        };
        terminationJustification: {
            isJustified: boolean;
            warnings: string[];
        };
        recommendation: string;
    }> {
        this.validateObjectId(employeeId, 'employeeId');

        const employee = await this.sharedRecruitmentService.validateEmployeeExists(employeeId);
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;

        // Get performance data from Performance Management
        const justification = await this.sharedRecruitmentService.validateTerminationJustification(
            employeeId,
            'hr' // Check as if HR initiated
        );

        // Determine recommendation based on performance data
        let recommendation: string;
        if (justification.performanceData.lowScoreAppraisals?.length > 0) {
            recommendation = 'Termination may be justified based on documented low performance scores.';
        } else if (!justification.performanceData.hasPublishedAppraisals) {
            recommendation = 'No performance data available. Document performance issues before proceeding with termination.';
        } else if (justification.performanceData.averageScore !== null && justification.performanceData.averageScore >= 70) {
            recommendation = 'Employee has satisfactory performance. Ensure termination reason is clearly documented and follows due process.';
        } else {
            recommendation = 'Review performance data carefully before proceeding with termination.';
        }

        return {
            employeeId,
            employeeName,
            employeeStatus: employee.status,
            performanceData: {
                hasPublishedAppraisals: justification.performanceData.hasPublishedAppraisals,
                totalAppraisals: justification.performanceData.totalAppraisals,
                averageScore: justification.performanceData.averageScore,
                lowScoreCount: justification.performanceData.lowScoreAppraisals?.length || 0,
                latestAppraisal: justification.performanceData.latestAppraisal ? {
                    cycleId: justification.performanceData.latestAppraisal.cycleId,
                    totalScore: justification.performanceData.latestAppraisal.totalScore,
                    publishedAt: justification.performanceData.latestAppraisal.hrPublishedAt,
                } : undefined,
            },
            terminationJustification: {
                isJustified: justification.isJustified,
                warnings: justification.warnings,
            },
            recommendation,
        };
    }

    async createTerminationRequest(dto: CreateTerminationRequestDto): Promise<TerminationRequest & { performanceWarnings?: string[] }> {
        this.validateObjectId(dto.employeeId, 'employeeId');
        this.validateObjectId(dto.contractId, 'contractId');

        const employee = await this.sharedRecruitmentService.validateEmployeeExists(dto.employeeId);

        if (employee.status === 'TERMINATED') {
            throw new BadRequestException('Cannot create termination request for already terminated employee');
        }

        const justification = await this.sharedRecruitmentService.validateTerminationJustification(
            dto.employeeId,
            dto.initiator
        );

        const contract = await this.contractModel.findById(dto.contractId).exec();
        if (!contract) {
            throw new NotFoundException(`Contract with ID ${dto.contractId} not found`);
        }

        const existingActiveRequest = await this.terminationRequestModel.findOne({
            employeeId: new Types.ObjectId(dto.employeeId),
            status: { $in: [TerminationStatus.PENDING, TerminationStatus.UNDER_REVIEW] }
        }).exec();

        if (existingActiveRequest) {
            throw new ConflictException('An active termination request already exists for this employee');
        }

        const existingApprovedRequest = await this.terminationRequestModel.findOne({
            employeeId: new Types.ObjectId(dto.employeeId),
            status: TerminationStatus.APPROVED
        }).exec();

        if (existingApprovedRequest) {
            throw new ConflictException('Employee already has an approved termination request');
        }

        if (dto.terminationDate) {
            const terminationDate = new Date(dto.terminationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (terminationDate < today) {
                throw new BadRequestException('Termination date cannot be in the past');
            }
        }

        const terminationRequest = new this.terminationRequestModel({
            employeeId: new Types.ObjectId(dto.employeeId),
            initiator: dto.initiator,
            reason: dto.reason,
            employeeComments: dto.employeeComments,
            hrComments: dto.hrComments,
            status: TerminationStatus.PENDING,
            terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
            contractId: new Types.ObjectId(dto.contractId),
        });

        const savedRequest = await terminationRequest.save();

        // Notify HR about new termination request
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
        await this.sharedRecruitmentService.notifyHRUsers(
            'TERMINATION_REQUEST_CREATED',
            `New termination request created for ${employeeName}. Initiator: ${dto.initiator}. Reason: ${dto.reason}. Status: Pending review.`,
        );

        // If HR/Manager initiated, notify the employee
        if (dto.initiator === TerminationInitiation.HR || dto.initiator === TerminationInitiation.MANAGER) {
            await this.sharedRecruitmentService.createNotification(
                dto.employeeId,
                'TERMINATION_NOTICE',
                `A termination review has been initiated for your employment. Reason: ${dto.reason}. Please contact HR for more information.`,
            );
        }

        const result: any = savedRequest.toObject();
        if (justification.warnings.length > 0) {
            result.performanceWarnings = justification.warnings;
            result.performanceData = {
                hasPublishedAppraisals: justification.performanceData.hasPublishedAppraisals,
                totalAppraisals: justification.performanceData.totalAppraisals,
                averageScore: justification.performanceData.averageScore,
                lowScoreCount: justification.performanceData.lowScoreAppraisals.length,
            };
        }

        return result;
    }

    async getAllTerminationRequests(
        employeeId?: string,
        status?: TerminationStatus,
        initiator?: TerminationInitiation
    ): Promise<TerminationRequest[]> {
        const filter: any = {};

        if (employeeId) {
            filter.employeeId = new Types.ObjectId(employeeId);
        }

        if (status) {
            filter.status = status;
        }

        if (initiator) {
            filter.initiator = initiator;
        }

        return this.terminationRequestModel
            .find(filter)
            .populate('contractId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getTerminationRequestsByInitiator(
        initiator: TerminationInitiation,
        status?: TerminationStatus
    ): Promise<TerminationRequest[]> {
        const filter: any = { initiator };

        if (status) {
            filter.status = status;
        }

        return this.terminationRequestModel
            .find(filter)
            .populate('contractId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getAllResignationRequests(status?: TerminationStatus): Promise<TerminationRequest[]> {
        return this.getTerminationRequestsByInitiator(TerminationInitiation.EMPLOYEE, status);
    }

    async getTerminationRequestsByStatus(status: TerminationStatus): Promise<TerminationRequest[]> {
        return this.terminationRequestModel
            .find({ status })
            .populate('contractId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getTerminationRequestById(id: string): Promise<TerminationRequest> {
        const request = await this.terminationRequestModel
            .findById(id)
            .populate('contractId')
            .exec();

        if (!request) {
            throw new NotFoundException(`Termination request with ID ${id} not found`);
        }

        return request;
    }

    /**
     * Update termination/resignation request status
     * Sends appropriate notifications at each step
     */
    async updateTerminationStatus(id: string, dto: UpdateTerminationStatusDto): Promise<TerminationRequest> {
        this.validateObjectId(id, 'id');

        const request = await this.terminationRequestModel.findById(id).exec();

        if (!request) {
            throw new NotFoundException(`Termination request with ID ${id} not found`);
        }

        // Normalize current status from DB (might be uppercase)
        const currentStatus = this.normalizeTerminationStatus(request.status);
        // Normalize new status from DTO
        const newStatus = this.normalizeTerminationStatus(dto.status);
        const allowedTransitions = this.validStatusTransitions[currentStatus];

        if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
            throw new BadRequestException(
                `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
                `Allowed transitions: ${allowedTransitions?.join(', ') || 'none (status is final)'}`
            );
        }

        // Use normalized status when saving
        request.status = newStatus;

        if (dto.hrComments) {
            request.hrComments = dto.hrComments;
        }

        // Normalize all fields before saving to handle case mismatches from DB
        this.normalizeTerminationRequest(request);

        const savedRequest = await request.save();

        // Get employee details for notifications
        const employee = await this.sharedRecruitmentService.validateEmployeeExists(request.employeeId.toString());
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
        const isResignation = request.initiator === TerminationInitiation.EMPLOYEE;

        // Notifications based on status transition
        if (newStatus === TerminationStatus.UNDER_REVIEW) {
            // Notify employee
            await this.sharedRecruitmentService.createNotification(
                request.employeeId.toString(),
                'REQUEST_UNDER_REVIEW',
                `Your ${isResignation ? 'resignation' : 'termination'} request is now under review.`,
            );

            // Notify HR
            await this.sharedRecruitmentService.notifyHRUsers(
                'REQUEST_UNDER_REVIEW',
                `${isResignation ? 'Resignation' : 'Termination'} request for ${employeeName} is now under review.`,
            );

            this.logger.log(`${isResignation ? 'Resignation' : 'Termination'} request ${id} moved to UNDER_REVIEW`);
        } else if (newStatus === TerminationStatus.APPROVED) {
            // Notify employee
            await this.sharedRecruitmentService.createNotification(
                request.employeeId.toString(),
                'REQUEST_APPROVED',
                `Your ${isResignation ? 'resignation' : 'termination'} request has been approved. ${request.terminationDate ? `Your last working day is ${request.terminationDate.toLocaleDateString()}.` : 'HR will contact you regarding next steps.'}`,
            );

            // Notify HR to create clearance checklist
            await this.sharedRecruitmentService.notifyHRUsers(
                'REQUEST_APPROVED',
                `${isResignation ? 'Resignation' : 'Termination'} APPROVED for ${employeeName}. ${request.terminationDate ? `Last day: ${request.terminationDate.toLocaleDateString()}.` : ''} Please create clearance checklist.`,
            );

            // General notification for termination approved
            await this.sharedRecruitmentService.notifyTerminationApproved({
                employeeId: request.employeeId.toString(),
                employeeName,
                terminationDate: request.terminationDate,
                initiator: request.initiator,
            });

            this.logger.log(`${isResignation ? 'Resignation' : 'Termination'} request ${id} APPROVED`);
        } else if (newStatus === TerminationStatus.REJECTED) {
            // Notify employee
            await this.sharedRecruitmentService.createNotification(
                request.employeeId.toString(),
                'REQUEST_REJECTED',
                `Your ${isResignation ? 'resignation' : 'termination'} request has been rejected. ${dto.hrComments ? `Reason: ${dto.hrComments}` : 'Please contact HR for more information.'}`,
            );

            // Notify HR
            await this.sharedRecruitmentService.notifyHRUsers(
                'REQUEST_REJECTED',
                `${isResignation ? 'Resignation' : 'Termination'} request for ${employeeName} has been REJECTED. ${dto.hrComments ? `Comments: ${dto.hrComments}` : ''}`,
            );

            this.logger.log(`${isResignation ? 'Resignation' : 'Termination'} request ${id} REJECTED`);
        }

        return savedRequest;
    }

    // ============================================================
    // OFF-018: Employee Resignation Request
    // BR 6: Employee separation triggered by resignation
    // ============================================================

    async createResignationRequest(dto: CreateResignationRequestDto): Promise<TerminationRequest> {
        this.validateObjectId(dto.employeeId, 'employeeId');
        this.validateObjectId(dto.contractId, 'contractId');

        const employee = await this.sharedRecruitmentService.validateEmployeeExists(dto.employeeId);
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;

        if (employee.status === EmployeeStatus.TERMINATED) {
            throw new BadRequestException('Cannot create resignation request for already terminated employee');
        }

        const contract = await this.contractModel.findById(dto.contractId).exec();
        if (!contract) {
            throw new NotFoundException(`Contract with ID ${dto.contractId} not found`);
        }

        const existingActiveRequest = await this.terminationRequestModel.findOne({
            employeeId: new Types.ObjectId(dto.employeeId),
            status: { $in: [TerminationStatus.PENDING, TerminationStatus.UNDER_REVIEW] }
        }).exec();

        if (existingActiveRequest) {
            throw new ConflictException('An active resignation/termination request already exists');
        }

        const existingApprovedRequest = await this.terminationRequestModel.findOne({
            employeeId: new Types.ObjectId(dto.employeeId),
            status: TerminationStatus.APPROVED
        }).exec();

        if (existingApprovedRequest) {
            throw new ConflictException('Employee already has an approved termination/resignation request');
        }

        if (dto.terminationDate) {
            const terminationDate = new Date(dto.terminationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (terminationDate < today) {
                throw new BadRequestException('Resignation date cannot be in the past');
            }
        }

        const resignationRequest = new this.terminationRequestModel({
            employeeId: new Types.ObjectId(dto.employeeId),
            initiator: TerminationInitiation.EMPLOYEE,
            reason: dto.reason,
            employeeComments: dto.employeeComments,
            status: TerminationStatus.PENDING,
            terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
            contractId: new Types.ObjectId(dto.contractId),
        });

        const savedRequest = await resignationRequest.save();

        // Notify the employee (confirmation)
        await this.sharedRecruitmentService.createNotification(
            dto.employeeId,
            'RESIGNATION_SUBMITTED',
            `Your resignation request has been submitted successfully. Reason: ${dto.reason}. ${dto.terminationDate ? `Proposed last working day: ${new Date(dto.terminationDate).toLocaleDateString()}` : 'Please wait for HR to set your last working day.'}`,
        );

        // Notify HR about new resignation
        await this.sharedRecruitmentService.notifyHRUsers(
            'RESIGNATION_REQUEST_SUBMITTED',
            `New resignation request from ${employeeName}. Reason: ${dto.reason}. ${dto.terminationDate ? `Proposed date: ${new Date(dto.terminationDate).toLocaleDateString()}` : ''} Status: Pending review.`,
        );

        this.logger.log(`Resignation request created for ${employeeName} (${dto.employeeId})`);

        return savedRequest;
    }

    // ============================================================
    // OFF-019: Track Resignation Request Status
    // ============================================================

    async getResignationRequestByEmployeeId(employeeId: string): Promise<TerminationRequest[]> {
        this.validateObjectId(employeeId, 'employeeId');

        return this.terminationRequestModel
            .find({ employeeId: new Types.ObjectId(employeeId), initiator: TerminationInitiation.EMPLOYEE })
            .populate('contractId')
            .sort({ createdAt: -1 })
            .exec();
    }

    /**
     * OFF-019: Get resignation status for tracking
     */
    async getResignationStatusWithWorkflow(employeeId: string): Promise<{
        employeeId: string;
        hasActiveRequest: boolean;
        activeRequest?: {
            requestId: string;
            reason: string;
            submittedAt: Date;
            proposedLastDay?: Date;
            status: TerminationStatus;
            hrComments?: string;
        };
        history: {
            requestId: string;
            reason: string;
            status: TerminationStatus;
            submittedAt: Date;
            resolvedAt?: Date;
        }[];
    }> {
        this.validateObjectId(employeeId, 'employeeId');

        await this.sharedRecruitmentService.validateEmployeeExists(employeeId);

        const allRequests = await this.terminationRequestModel
            .find({ employeeId: new Types.ObjectId(employeeId), initiator: TerminationInitiation.EMPLOYEE })
            .sort({ createdAt: -1 })
            .exec();

        const activeRequest = allRequests.find(
            r => r.status === TerminationStatus.PENDING || r.status === TerminationStatus.UNDER_REVIEW
        );

        // Build history from past requests
        const history = allRequests
            .filter(r => r.status === TerminationStatus.APPROVED || r.status === TerminationStatus.REJECTED)
            .map(r => ({
                requestId: r._id.toString(),
                reason: r.reason,
                status: r.status,
                submittedAt: (r as any).createdAt,
                resolvedAt: (r as any).updatedAt,
            }));

        return {
            employeeId,
            hasActiveRequest: !!activeRequest,
            activeRequest: activeRequest ? {
                requestId: activeRequest._id.toString(),
                reason: activeRequest.reason,
                submittedAt: (activeRequest as any).createdAt,
                proposedLastDay: activeRequest.terminationDate,
                status: activeRequest.status,
                hrComments: activeRequest.hrComments,
            } : undefined,
            history,
        };
    }

    // ============================================================
    // OFF-006: Create Offboarding Checklist
    // BR 13(a): Clearance checklist required for IT assets, ID cards, equipment
    // ============================================================

    async createClearanceChecklist(dto: CreateClearanceChecklistDto): Promise<ClearanceChecklist & { employeeName?: string }> {
        this.validateObjectId(dto.terminationId, 'terminationId');

        const termination = await this.terminationRequestModel.findById(dto.terminationId).exec();
        if (!termination) {
            throw new NotFoundException(`Termination request with ID ${dto.terminationId} not found`);
        }

        if (termination.status !== TerminationStatus.APPROVED) {
            throw new BadRequestException('Clearance checklist can only be created for approved termination requests');
        }

        const existingChecklist = await this.clearanceChecklistModel
            .findOne({ terminationId: new Types.ObjectId(dto.terminationId) })
            .exec();

        if (existingChecklist) {
            throw new ConflictException('Clearance checklist already exists for this termination request');
        }

        // Get employee details for notifications
        const employee = await this.sharedRecruitmentService.validateEmployeeExists(termination.employeeId.toString());
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;

        // BR 13(b,c): Default departments for clearance - IT, Finance, Facilities, HR, Admin
        const defaultDepartments = ['IT', 'Finance', 'Facilities', 'HR', 'Admin'];
        const items = dto.items && dto.items.length > 0
            ? dto.items.map(item => ({
                department: item.department,
                status: ApprovalStatus.PENDING,
                comments: item.comments || '',
                updatedBy: item.updatedBy ? new Types.ObjectId(item.updatedBy) : undefined,
                updatedAt: new Date(),
            }))
            : defaultDepartments.map(dept => ({
                department: dept,
                status: ApprovalStatus.PENDING,
                comments: '',
                updatedAt: new Date(),
            }));

        const equipmentList = dto.equipmentList?.map(equip => ({
            equipmentId: equip.equipmentId ? new Types.ObjectId(equip.equipmentId) : undefined,
            name: equip.name,
            returned: equip.returned ?? false,
            condition: equip.condition || '',
        })) || [];

        const checklist = new this.clearanceChecklistModel({
            terminationId: new Types.ObjectId(dto.terminationId),
            items,
            equipmentList,
            cardReturned: dto.cardReturned || false,
        });

        const savedChecklist = await checklist.save();

        // Notify employee about clearance checklist
        await this.sharedRecruitmentService.createNotification(
            termination.employeeId.toString(),
            'CLEARANCE_CHECKLIST_CREATED',
            `Your offboarding clearance checklist has been created. Please coordinate with IT, Finance, Facilities, HR, and Admin departments to complete all clearance requirements and return company property.`,
        );

        // Notify HR about new clearance checklist
        await this.sharedRecruitmentService.notifyHRUsers(
            'CLEARANCE_CHECKLIST_CREATED',
            `Clearance checklist created for ${employeeName}. Departments to clear: ${items.map(i => i.department).join(', ')}. Equipment items: ${equipmentList.length}.`,
        );

        // Notify IT department specifically for access revocation preparation
        await this.sharedRecruitmentService.notifyITAdmins(
            'CLEARANCE_PENDING_IT',
            `IT clearance pending for ${employeeName}. Please prepare for system access revocation and collect IT equipment.`,
        );

        this.logger.log(`Clearance checklist created for termination ${dto.terminationId}`);

        const result: any = savedChecklist.toObject();
        result.employeeName = employeeName;
        return result;
    }

    async getClearanceChecklistByTerminationId(terminationId: string): Promise<ClearanceChecklist> {
        const checklist = await this.clearanceChecklistModel
            .findOne({ terminationId: new Types.ObjectId(terminationId) })
            .populate('terminationId')
            .exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist not found for termination request ${terminationId}`);
        }

        return checklist;
    }

    async getClearanceChecklistById(id: string): Promise<ClearanceChecklist> {
        const checklist = await this.clearanceChecklistModel
            .findById(id)
            .populate('terminationId')
            .exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist with ID ${id} not found`);
        }

        return checklist;
    }

    // ============================================================
    // OFF-010: Multi-department Exit Clearance Sign-offs
    // BR 13(b,c): Clearance across IT, Finance, Facilities, HR, Admin
    // BR 14: Final approvals filed to HR
    // ============================================================

    async updateClearanceItem(checklistId: string, dto: UpdateClearanceItemDto): Promise<{
        checklist: ClearanceChecklist;
        departmentCleared: boolean;
        allDepartmentsCleared: boolean;
        fullyCleared: boolean;
        pendingDepartments: string[];
        filedToHR: boolean;
    }> {
        this.validateObjectId(checklistId, 'checklistId');

        const checklist = await this.clearanceChecklistModel.findById(checklistId).populate('terminationId').exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist with ID ${checklistId} not found`);
        }

        const termination = await this.terminationRequestModel.findById(checklist.terminationId).exec();
        if (!termination || termination.status !== TerminationStatus.APPROVED) {
            throw new BadRequestException('Cannot update clearance items for non-approved termination requests');
        }

        const itemIndex = checklist.items.findIndex(item => item.department === dto.department);

        if (itemIndex === -1) {
            throw new NotFoundException(`Department ${dto.department} not found in clearance checklist`);
        }

        const previousStatus = checklist.items[itemIndex].status;

        checklist.items[itemIndex] = {
            department: dto.department,
            status: dto.status,
            comments: dto.comments || checklist.items[itemIndex].comments,
            updatedBy: new Types.ObjectId(dto.updatedBy),
            updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(),
        };

        // Normalize all item statuses before saving (fix uppercase values from DB)
        this.normalizeAllClearanceItemStatuses(checklist);

        const updated = await checklist.save();

        // Get employee details for notifications
        const employee = await this.sharedRecruitmentService.validateEmployeeExists(termination.employeeId.toString());
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;

        // Check clearance status
        const allDepartmentsCleared = checklist.items.every(item => item.status === ApprovalStatus.APPROVED);
        const allEquipmentReturned = checklist.equipmentList.length === 0 || checklist.equipmentList.every(item => item.returned);
        const fullyCleared = allDepartmentsCleared && allEquipmentReturned && checklist.cardReturned;

        const pendingDepartments = checklist.items
            .filter(item => item.status !== ApprovalStatus.APPROVED)
            .map(item => item.department);

        // Notify when department signs off (status changed)
        if (previousStatus !== dto.status) {
            if (dto.status === ApprovalStatus.APPROVED) {
                // Notify HR about department approval
                await this.sharedRecruitmentService.notifyHRUsers(
                    'DEPARTMENT_CLEARANCE_APPROVED',
                    `${dto.department} department has approved clearance for ${employeeName}. ${pendingDepartments.length > 0 ? `Pending: ${pendingDepartments.join(', ')}` : 'All departments cleared!'}`,
                );

                // Notify employee
                await this.sharedRecruitmentService.createNotification(
                    termination.employeeId.toString(),
                    'DEPARTMENT_CLEARANCE_APPROVED',
                    `${dto.department} department has approved your clearance. ${pendingDepartments.length > 0 ? `Still pending: ${pendingDepartments.join(', ')}` : 'All departments have cleared you!'}`,
                );

                this.logger.log(`${dto.department} cleared for ${employeeName} (termination: ${termination._id})`);
            } else if (dto.status === ApprovalStatus.REJECTED) {
                // Notify HR about rejection
                await this.sharedRecruitmentService.notifyHRUsers(
                    'DEPARTMENT_CLEARANCE_REJECTED',
                    `${dto.department} department has REJECTED clearance for ${employeeName}. Comments: ${dto.comments || 'None'}`,
                );

                // Notify employee
                await this.sharedRecruitmentService.createNotification(
                    termination.employeeId.toString(),
                    'DEPARTMENT_CLEARANCE_REJECTED',
                    `${dto.department} department has flagged an issue with your clearance. Please contact them to resolve. Comments: ${dto.comments || 'None'}`,
                );
            }
        }

        // BR 14: File final approvals to HR when fully cleared
        let filedToHR = false;
        if (fullyCleared) {
            await this.sharedRecruitmentService.notifyClearanceComplete({
                employeeId: termination.employeeId.toString(),
                employeeName,
                terminationId: termination._id.toString(),
            });

            // BR 14: Final approvals filed to HR
            await this.sharedRecruitmentService.notifyHRUsers(
                'CLEARANCE_COMPLETE_FILED',
                `🎉 CLEARANCE COMPLETE: ${employeeName} has been fully cleared by all departments. All equipment returned. Access card returned. Final settlement can now proceed. This record has been filed to HR.`,
            );

            filedToHR = true;
            this.logger.log(`Full clearance complete for ${employeeName} - filed to HR`);
        }

        return {
            checklist: updated,
            departmentCleared: dto.status === ApprovalStatus.APPROVED,
            allDepartmentsCleared,
            fullyCleared,
            pendingDepartments,
            filedToHR,
        };
    }

    async updateEquipmentItem(checklistId: string, equipmentName: string, dto: UpdateEquipmentItemDto): Promise<ClearanceChecklist> {
        this.validateObjectId(checklistId, 'checklistId');

        const checklist = await this.clearanceChecklistModel.findById(checklistId).exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist with ID ${checklistId} not found`);
        }

        const equipmentIndex = checklist.equipmentList.findIndex(item => item.name === equipmentName);

        if (equipmentIndex === -1) {
            throw new NotFoundException(`Equipment ${equipmentName} not found in clearance checklist`);
        }

        checklist.equipmentList[equipmentIndex] = {
            equipmentId: dto.equipmentId ? new Types.ObjectId(dto.equipmentId) : checklist.equipmentList[equipmentIndex].equipmentId,
            name: dto.name,
            returned: dto.returned,
            condition: dto.condition || checklist.equipmentList[equipmentIndex].condition,
        };

        // Normalize all item statuses before saving (fix uppercase values from DB)
        this.normalizeAllClearanceItemStatuses(checklist);

        return checklist.save();
    }

    async addEquipmentToChecklist(checklistId: string, dto: UpdateEquipmentItemDto): Promise<ClearanceChecklist> {
        this.validateObjectId(checklistId, 'checklistId');

        const checklist = await this.clearanceChecklistModel.findById(checklistId).exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist with ID ${checklistId} not found`);
        }

        checklist.equipmentList.push({
            equipmentId: dto.equipmentId ? new Types.ObjectId(dto.equipmentId) : undefined,
            name: dto.name,
            returned: dto.returned,
            condition: dto.condition || '',
        });

        // Normalize all item statuses before saving (fix uppercase values from DB)
        this.normalizeAllClearanceItemStatuses(checklist);

        return checklist.save();
    }

    async updateCardReturn(checklistId: string, cardReturned: boolean): Promise<ClearanceChecklist> {
        this.validateObjectId(checklistId, 'checklistId');

        const checklist = await this.clearanceChecklistModel.findById(checklistId).exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist with ID ${checklistId} not found`);
        }

        checklist.cardReturned = cardReturned;

        // Normalize all item statuses before saving (fix uppercase values from DB)
        this.normalizeAllClearanceItemStatuses(checklist);

        return checklist.save();
    }

    async getClearanceCompletionStatus(checklistId: string): Promise<{
        checklistId: string;
        allDepartmentsCleared: boolean;
        allEquipmentReturned: boolean;
        cardReturned: boolean;
        fullyCleared: boolean;
        pendingDepartments: string[];
        pendingEquipment: string[];
    }> {
        const checklist = await this.clearanceChecklistModel.findById(checklistId).exec();

        if (!checklist) {
            throw new NotFoundException(`Clearance checklist with ID ${checklistId} not found`);
        }

        const allDepartmentsCleared = checklist.items.every(item => item.status === ApprovalStatus.APPROVED);
        const allEquipmentReturned = checklist.equipmentList.every(item => item.returned);
        const cardReturned = checklist.cardReturned;

        const pendingDepartments = checklist.items
            .filter(item => item.status !== ApprovalStatus.APPROVED)
            .map(item => item.department);

        const pendingEquipment = checklist.equipmentList
            .filter(item => !item.returned)
            .map(item => item.name);

        const fullyCleared = allDepartmentsCleared && allEquipmentReturned && cardReturned;

        return {checklistId, allDepartmentsCleared, allEquipmentReturned, cardReturned, fullyCleared, pendingDepartments, pendingEquipment,};
    }

    // ============================================================
    // OFF-007: System and Account Access Revocation
    // BR 3(c), 19: Access revocation for security
    // ============================================================

    /**
     * OFF-007: Get employees pending access revocation
     * Returns employees with approved termination who still have active status
     */
    async getEmployeesPendingAccessRevocation(): Promise<{
        employeeId: string;
        employeeName: string;
        employeeNumber: string;
        workEmail?: string;
        terminationDate?: Date;
        terminationReason: string;
        approvedAt: Date;
        daysSinceApproval: number;
        isUrgent: boolean;
    }[]> {
        // Find all approved terminations
        const approvedTerminations = await this.terminationRequestModel
            .find({ status: TerminationStatus.APPROVED })
            .sort({ updatedAt: -1 })
            .exec();

        const pendingRevocations: {
            employeeId: string;
            employeeName: string;
            employeeNumber: string;
            workEmail?: string;
            terminationDate?: Date;
            terminationReason: string;
            approvedAt: Date;
            daysSinceApproval: number;
            isUrgent: boolean;
        }[] = [];

        for (const termination of approvedTerminations) {
            const employee = await this.employeeProfileModel.findById(termination.employeeId).exec();

            // Only include if employee still has ACTIVE status (access not yet revoked)
            if (employee && employee.status !== EmployeeStatus.TERMINATED) {
                const approvedAt = (termination as any).updatedAt || (termination as any).createdAt;
                const daysSinceApproval = Math.floor((Date.now() - new Date(approvedAt).getTime()) / (1000 * 60 * 60 * 24));

                // Urgent if termination date has passed or approval > 3 days old
                const isUrgent = (termination.terminationDate && new Date(termination.terminationDate) <= new Date())
                    || daysSinceApproval > 3;

                pendingRevocations.push({
                    employeeId: employee._id.toString(),
                    employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
                    employeeNumber: employee.employeeNumber,
                    workEmail: employee.workEmail,
                    terminationDate: termination.terminationDate,
                    terminationReason: termination.reason,
                    approvedAt,
                    daysSinceApproval,
                    isUrgent,
                });
            }
        }

        // Sort by urgency and days since approval
        return pendingRevocations.sort((a, b) => {
            if (a.isUrgent && !b.isUrgent) return -1;
            if (!a.isUrgent && b.isUrgent) return 1;
            return b.daysSinceApproval - a.daysSinceApproval;
        });
    }

    /**
     * OFF-007: Revoke system and account access
     * BR 3(c), 19: Security - revoke access upon termination
     */
    async revokeSystemAccess(dto: RevokeAccessDto): Promise<{
        success: boolean;
        employeeId: string;
        message: string;
        revokedAt: Date;
        details: {
            employeeDeactivated: boolean;
            systemRolesDisabled: number;
        };
    }> {
        this.validateObjectId(dto.employeeId, 'employeeId');

        const employee = await this.employeeProfileModel.findById(dto.employeeId).exec();
        if (!employee) {
            throw new NotFoundException(`Employee with ID ${dto.employeeId} not found`);
        }

        const terminationRequest = await this.terminationRequestModel
            .findOne({
                employeeId: new Types.ObjectId(dto.employeeId),
                status: TerminationStatus.APPROVED
            })
            .exec();

        if (!terminationRequest) {
            throw new BadRequestException(
                'No approved termination request found for this employee. Access revocation requires approved termination.'
            );
        }

        // Check if already terminated
        if (employee.status === EmployeeStatus.TERMINATED) {
            return {
                success: true,
                employeeId: dto.employeeId,
                message: 'Employee already terminated. Access was already revoked.',
                revokedAt: new Date(),
                details: {
                    employeeDeactivated: true,
                    systemRolesDisabled: 0,
                },
            };
        }

        // 1. Update employee status to TERMINATED
        employee.status = EmployeeStatus.TERMINATED;
        employee.statusEffectiveFrom = new Date();
        await employee.save();

        // 2. Disable all system roles for this employee
        const roleUpdateResult = await this.employeeSystemRoleModel.updateMany(
            { employeeProfileId: new Types.ObjectId(dto.employeeId) },
            { $set: { isActive: false } }
        ).exec();

        // 3. Notify relevant parties
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;

        await this.sharedRecruitmentService.notifyHRUsers(
            'SYSTEM_ACCESS_REVOKED',
            `System access revoked for ${employeeName} (${employee.employeeNumber}). All roles disabled.`
        );

        await this.sharedRecruitmentService.notifyITAdmins(
            'ACCESS_REVOCATION_COMPLETED',
            `Access revocation completed for ${employeeName} (${employee.employeeNumber}). Employee status: TERMINATED.`
        );

        this.logger.log(`System access revoked for employee ${dto.employeeId}: ${roleUpdateResult.modifiedCount} roles disabled`);

        return {
            success: true,
            employeeId: dto.employeeId,
            message: 'System access revoked successfully. Employee terminated and all roles disabled.',
            revokedAt: new Date(),
            details: {
                employeeDeactivated: true,
                systemRolesDisabled: roleUpdateResult.modifiedCount,
            },
        };
    }

    // ============================================================
    // OFF-013: Final Settlement and Benefits Termination
    // BR 9, 11: Unused annuals encashed, benefits auto-terminated
    // ============================================================

    /**
     * OFF-013: Preview final settlement before triggering
     * Shows leave encashment and benefit calculations without creating records
     */
    async previewFinalSettlement(terminationId: string): Promise<{
        terminationId: string;
        employeeId: string;
        employeeName: string;
        terminationDate?: Date;
        clearanceStatus: {
            hasChecklist: boolean;
            isComplete: boolean;
            pendingItems?: string[];
        };
        leaveEncashment: {
            unusedDays: number;
            dailyRate: number;
            encashmentAmount: number;
            leaveDetails: {
                leaveType: string;
                entitled: number;
                taken: number;
                remaining: number;
            }[];
        };
        terminationBenefit: {
            hasConfig: boolean;
            configName?: string;
            baseAmount: number;
            totalAmount: number;
        };
        canTrigger: boolean;
        blockers: string[];
    }> {
        this.validateObjectId(terminationId, 'terminationId');

        const terminationRequest = await this.terminationRequestModel.findById(terminationId).exec();
        if (!terminationRequest) {
            throw new NotFoundException(`Termination request with ID ${terminationId} not found`);
        }

        const employee = await this.sharedRecruitmentService.validateEmployeeExists(terminationRequest.employeeId.toString());
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
        const employeeId = terminationRequest.employeeId.toString();

        const blockers: string[] = [];

        // Check termination status
        if (terminationRequest.status !== TerminationStatus.APPROVED) {
            blockers.push(`Termination request is not approved (current: ${terminationRequest.status})`);
        }

        // Check clearance status
        const clearanceChecklist = await this.clearanceChecklistModel
            .findOne({ terminationId: new Types.ObjectId(terminationId) })
            .exec();

        let clearanceStatus: { hasChecklist: boolean; isComplete: boolean; pendingItems?: string[] };
        if (clearanceChecklist) {
            const completionStatus = await this.getClearanceCompletionStatus(clearanceChecklist._id.toString());
            clearanceStatus = {
                hasChecklist: true,
                isComplete: completionStatus.fullyCleared,
                pendingItems: [...completionStatus.pendingDepartments, ...completionStatus.pendingEquipment],
            };
            if (!completionStatus.fullyCleared) {
                blockers.push(`Clearance incomplete: ${clearanceStatus.pendingItems?.join(', ')}`);
            }
        } else {
            clearanceStatus = { hasChecklist: false, isComplete: false };
            blockers.push('No clearance checklist created');
        }

        // Calculate leave encashment preview
        const leaveEncashment = await this.calculateLeaveEncashmentDetailed(employeeId);

        // Get termination benefit config
        const benefitConfig = await this.terminationBenefitsModel.findOne({
            status: 'approved',
        }).exec();

        const baseAmount = (benefitConfig as any)?.amount || 0;
        const totalAmount = baseAmount + leaveEncashment.encashmentAmount;

        const terminationBenefit = {
            hasConfig: !!benefitConfig,
            configName: benefitConfig?.name,
            baseAmount,
            totalAmount,
        };

        // Check if already triggered
        const existingBenefit = await this.employeeTerminationResignationModel.findOne({
            employeeId: new Types.ObjectId(employeeId),
            terminationId: new Types.ObjectId(terminationId),
        }).exec();

        if (existingBenefit) {
            blockers.push('Final settlement already triggered');
        }

        return {
            terminationId,
            employeeId,
            employeeName,
            terminationDate: terminationRequest.terminationDate,
            clearanceStatus,
            leaveEncashment,
            terminationBenefit,
            canTrigger: blockers.length === 0,
            blockers,
        };
    }

    /**
     * OFF-013: Trigger final settlement
     * BR 9, 11: Encash unused leave, terminate benefits
     */
    async triggerFinalSettlement(dto: TriggerFinalSettlementDto): Promise<{
        success: boolean;
        terminationId: string;
        message: string;
        triggeredAt: Date;
        leaveEncashment?: {
            unusedDays: number;
            encashmentAmount: number;
        };
        terminationBenefit?: {
            benefitId: string;
            amount: number;
        };
    }> {
        this.validateObjectId(dto.terminationId, 'terminationId');

        const terminationRequest = await this.terminationRequestModel
            .findById(dto.terminationId)
            .exec();

        if (!terminationRequest) {
            throw new NotFoundException(`Termination request with ID ${dto.terminationId} not found`);
        }

        if (terminationRequest.status !== TerminationStatus.APPROVED) {
            throw new BadRequestException('Final settlement can only be triggered for approved termination requests');
        }

        const clearanceChecklist = await this.clearanceChecklistModel
            .findOne({ terminationId: new Types.ObjectId(dto.terminationId) })
            .exec();

        if (clearanceChecklist) {
            const completionStatus = await this.getClearanceCompletionStatus(clearanceChecklist._id.toString());

            if (!completionStatus.fullyCleared) {
                throw new BadRequestException(
                    `Clearance checklist is not fully complete. Pending: ${completionStatus.pendingDepartments.join(', ')}`
                );
            }
        }

        const employee = await this.sharedRecruitmentService.validateEmployeeExists(terminationRequest.employeeId.toString());
        const employeeName = employee.fullName || `${employee.firstName} ${employee.lastName}`;
        const employeeId = terminationRequest.employeeId.toString();

        // Integration with Leaves Module - Fetch employee leave balance and calculate unused annual leave encashment
        let leaveEncashment: { unusedDays: number; encashmentAmount: number } | undefined;
        try {
            leaveEncashment = await this.calculateLeaveEncashment(employeeId);
            this.logger.log(`Leave encashment calculated for employee ${employeeId}: ${leaveEncashment.unusedDays} days, ${leaveEncashment.encashmentAmount} amount`);
        } catch (err) {
            this.logger.warn(`Failed to calculate leave encashment for employee ${employeeId}: ${err.message}`);
        }

        // Integration with Payroll Module - Create termination benefit record
        let terminationBenefit: { benefitId: string; amount: number } | undefined;
        try {
            terminationBenefit = await this.createTerminationBenefitRecord(
                employeeId,
                dto.terminationId,
                leaveEncashment?.encashmentAmount || 0
            );
            this.logger.log(`Termination benefit created for employee ${employeeId}: ${terminationBenefit.amount} amount`);
        } catch (err) {
            this.logger.warn(`Failed to create termination benefit for employee ${employeeId}: ${err.message}`);
        }

        await this.sharedRecruitmentService.notifyFinalSettlementTriggered({
            employeeId,
            employeeName,
            terminationId: dto.terminationId,
        });

        return {
            success: true,
            terminationId: dto.terminationId,
            message: 'Final settlement triggered. Benefits termination scheduled and final pay calculation initiated.',
            triggeredAt: new Date(),
            leaveEncashment,
            terminationBenefit,
        };
    }

    /**
     * Integration with Leaves Module
     * Fetches employee leave balances and calculates unused annual leave encashment
     * BR 9, 11: Unused annuals encashed at termination
     */
    private async calculateLeaveEncashment(employeeId: string): Promise<{
        unusedDays: number;
        encashmentAmount: number;
    }> {
        // Fetch employee entitlements
        const entitlements = await this.leaveEntitlementModel.find({
            employeeId: new Types.ObjectId(employeeId),
        }).exec();

        if (!entitlements || entitlements.length === 0) {
            return { unusedDays: 0, encashmentAmount: 0 };
        }

        // Fetch leave types to identify annual leave types (encashable)
        const leaveTypeIds = entitlements.map(e => e.leaveTypeId);
        const leaveTypes = await this.leaveTypeModel.find({
            _id: { $in: leaveTypeIds },
        }).exec();

        // Calculate total unused days for encashable leave types
        let totalUnusedDays = 0;
        for (const entitlement of entitlements) {
            const leaveType = leaveTypes.find(lt => lt._id.toString() === entitlement.leaveTypeId?.toString());

            // Check if this leave type is encashable (annual leave types typically are)
            const isEncashable = (leaveType as any)?.isEncashable !== false &&
                                 ((leaveType as any)?.code === 'ANNUAL' ||
                                  leaveType?.name?.toLowerCase().includes('annual') ||
                                  (leaveType as any)?.category === 'annual');

            if (isEncashable) {
                // Calculate taken days from approved leave requests
                const takenAgg = await this.leaveRequestModel.aggregate([
                    {
                        $match: {
                            employeeId: new Types.ObjectId(employeeId),
                            leaveTypeId: entitlement.leaveTypeId,
                            status: LeaveStatus.APPROVED,
                        },
                    },
                    { $group: { _id: null, takenDays: { $sum: '$durationDays' } } },
                ]);

                const takenDays = takenAgg[0]?.takenDays ?? 0;
                const accrued = (entitlement as any).accruedRounded ?? (entitlement as any).accruedActual ?? entitlement.yearlyEntitlement ?? 0;
                const carryForward = (entitlement as any).carryForward ?? 0;
                const taken = (entitlement as any).taken ?? 0;
                const remaining = Math.max(0, accrued + carryForward - takenDays - taken);

                totalUnusedDays += remaining;
            }
        }

        // Calculate encashment amount based on daily rate
        let dailyRate = 0;
        try {
            const employeeProfile = await this.employeeProfileModel.findById(employeeId).exec();

            if (employeeProfile?.payGradeId) {
                const payGradeDoc = await this.payGradeModel.findById(employeeProfile.payGradeId).exec();

                if (payGradeDoc?.baseSalary) {
                    // Calculate daily rate (assuming 22 working days per month)
                    dailyRate = payGradeDoc.baseSalary / 22;
                }
            }

            // Fallback: Try to get from contract if pay grade not found
            if (dailyRate === 0) {
                const contract = await this.contractModel.findOne({
                    offerId: { $exists: true },
                }).sort({ createdAt: -1 }).exec();

                if (contract?.grossSalary) {
                    dailyRate = contract.grossSalary / 22;
                }
            }
        } catch (err) {
            this.logger.warn(`Failed to fetch daily rate for employee ${employeeId}: ${err.message}`);
        }

        const encashmentAmount = Math.round(totalUnusedDays * dailyRate * 100) / 100;

        return {
            unusedDays: totalUnusedDays,
            encashmentAmount,
        };
    }

    /**
     * Detailed leave encashment calculation for preview
     * Returns breakdown by leave type
     */
    private async calculateLeaveEncashmentDetailed(employeeId: string): Promise<{
        unusedDays: number;
        dailyRate: number;
        encashmentAmount: number;
        leaveDetails: {
            leaveType: string;
            entitled: number;
            taken: number;
            remaining: number;
        }[];
    }> {
        const leaveDetails: { leaveType: string; entitled: number; taken: number; remaining: number }[] = [];

        // Fetch employee entitlements
        const entitlements = await this.leaveEntitlementModel.find({
            employeeId: new Types.ObjectId(employeeId),
        }).exec();

        if (!entitlements || entitlements.length === 0) {
            return { unusedDays: 0, dailyRate: 0, encashmentAmount: 0, leaveDetails: [] };
        }

        // Fetch leave types
        const leaveTypeIds = entitlements.map(e => e.leaveTypeId);
        const leaveTypes = await this.leaveTypeModel.find({
            _id: { $in: leaveTypeIds },
        }).exec();

        // Calculate total unused days for encashable leave types
        let totalUnusedDays = 0;
        for (const entitlement of entitlements) {
            const leaveType = leaveTypes.find(lt => lt._id.toString() === entitlement.leaveTypeId?.toString());

            const isEncashable = (leaveType as any)?.isEncashable !== false &&
                                 ((leaveType as any)?.code === 'ANNUAL' ||
                                  leaveType?.name?.toLowerCase().includes('annual') ||
                                  (leaveType as any)?.category === 'annual');

            if (isEncashable) {
                const takenAgg = await this.leaveRequestModel.aggregate([
                    {
                        $match: {
                            employeeId: new Types.ObjectId(employeeId),
                            leaveTypeId: entitlement.leaveTypeId,
                            status: LeaveStatus.APPROVED,
                        },
                    },
                    { $group: { _id: null, takenDays: { $sum: '$durationDays' } } },
                ]);

                const takenDays = takenAgg[0]?.takenDays ?? 0;
                const accrued = (entitlement as any).accruedRounded ?? (entitlement as any).accruedActual ?? entitlement.yearlyEntitlement ?? 0;
                const carryForward = (entitlement as any).carryForward ?? 0;
                const taken = (entitlement as any).taken ?? takenDays;
                const entitled = accrued + carryForward;
                const remaining = Math.max(0, entitled - taken);

                totalUnusedDays += remaining;

                leaveDetails.push({
                    leaveType: leaveType?.name || 'Unknown',
                    entitled,
                    taken,
                    remaining,
                });
            }
        }

        // Calculate daily rate
        let dailyRate = 0;
        try {
            const employeeProfile = await this.employeeProfileModel.findById(employeeId).exec();

            if (employeeProfile?.payGradeId) {
                const payGradeDoc = await this.payGradeModel.findById(employeeProfile.payGradeId).exec();
                if (payGradeDoc?.baseSalary) {
                    dailyRate = payGradeDoc.baseSalary / 22;
                }
            }

            if (dailyRate === 0) {
                const contract = await this.contractModel.findOne({
                    offerId: { $exists: true },
                }).sort({ createdAt: -1 }).exec();
                if (contract?.grossSalary) {
                    dailyRate = contract.grossSalary / 22;
                }
            }
        } catch (err) {
            this.logger.warn(`Failed to fetch daily rate for employee ${employeeId}: ${err.message}`);
        }

        const encashmentAmount = Math.round(totalUnusedDays * dailyRate * 100) / 100;

        return {
            unusedDays: totalUnusedDays,
            dailyRate: Math.round(dailyRate * 100) / 100,
            encashmentAmount,
            leaveDetails,
        };
    }

    /**
     * Integration with Payroll Module
     * Creates termination/resignation benefit record in payroll execution
     * BR 29, BR 56: Auto-calculate termination/resignation benefits
     */
    private async createTerminationBenefitRecord(
        employeeId: string,
        terminationId: string,
        leaveEncashmentAmount: number
    ): Promise<{
        benefitId: string;
        amount: number;
    }> {
        // Check if benefit record already exists
        const existingBenefit = await this.employeeTerminationResignationModel.findOne({
            employeeId: new Types.ObjectId(employeeId),
            terminationId: new Types.ObjectId(terminationId),
        }).exec();

        if (existingBenefit) {
            return {
                benefitId: existingBenefit._id.toString(),
                amount: existingBenefit.givenAmount || 0,
            };
        }

        // Fetch termination benefit configuration
        const benefitConfig = await this.terminationBenefitsModel.findOne({
            status: 'approved',
        }).exec();

        // Calculate total benefit amount
        let baseAmount = 0;
        if (benefitConfig) {
            baseAmount = (benefitConfig as any).amount || 0;
        }

        // Add leave encashment to the total
        const totalAmount = baseAmount + leaveEncashmentAmount;

        // Create the benefit record
        const benefitRecord = await this.employeeTerminationResignationModel.create({
            employeeId: new Types.ObjectId(employeeId),
            benefitId: benefitConfig?._id || new Types.ObjectId(),
            terminationId: new Types.ObjectId(terminationId),
            givenAmount: totalAmount,
            status: BenefitStatus.PENDING,
        });

        return {
            benefitId: benefitRecord._id.toString(),
            amount: totalAmount,
        };
    }

    async getAllClearanceChecklists(): Promise<ClearanceChecklist[]> {
        return this.clearanceChecklistModel
            .find()
            .populate('terminationId')
            .sort({ createdAt: -1 })
            .exec();
    }

    async deleteTerminationRequest(id: string): Promise<{ message: string; deletedId: string }> {
        const request = await this.terminationRequestModel.findById(id).exec();

        if (!request) {
            throw new NotFoundException(`Termination request with ID ${id} not found`);
        }

        if (request.status === TerminationStatus.APPROVED) {
            throw new BadRequestException('Cannot delete an approved termination request');
        }

        await this.terminationRequestModel.findByIdAndDelete(id).exec();

        await this.clearanceChecklistModel.deleteOne({ terminationId: new Types.ObjectId(id) }).exec();

        return {message: 'Termination request deleted successfully', deletedId: id,};
    }
}

