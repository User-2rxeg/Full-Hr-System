import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { AppraisalTemplate, AppraisalTemplateDocument } from '../models/performance/appraisal-template.schema';
import { AppraisalCycle, AppraisalCycleDocument } from '../models/performance/appraisal-cycle.schema';
import { AppraisalAssignment, AppraisalAssignmentDocument } from '../models/performance/appraisal-assignment.schema';
import { AppraisalRecord, AppraisalRecordDocument } from '../models/performance/appraisal-record.schema';
import { AppraisalDispute, AppraisalDisputeDocument } from '../models/performance/appraisal-dispute.schema';
import { AppraisalCycleStatus, AppraisalAssignmentStatus, AppraisalRecordStatus, AppraisalDisputeStatus, AppraisalTemplateType } from '../enums/performance.enums';
import { CreateAppraisalTemplateDto, UpdateAppraisalTemplateDto } from '../dto/performance/appraisal-template.dto';
import { CreateAppraisalCycleDto, UpdateAppraisalCycleDto } from '../dto/performance/appraisal-cycle.dto';
import { BulkCreateAppraisalAssignmentDto, CreateAppraisalAssignmentDto } from '../dto/performance/appraisal-assignment.dto';
import { SubmitAppraisalRecordDto } from '../dto/performance/appraisal-record.dto';
import { FileAppraisalDisputeDto, ResolveAppraisalDisputeDto } from '../dto/performance/appraisal-dispute.dto';
import { SharedPerformanceService } from '../../shared/services/shared-performance.service';

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export interface TemplateSearchQuery {
    page?: number;
    limit?: number;
    query?: string;
    templateType?: AppraisalTemplateType;
    isActive?: boolean;
}

export interface CycleSearchQuery {
    page?: number;
    limit?: number;
    query?: string;
    status?: AppraisalCycleStatus;
    cycleType?: AppraisalTemplateType;
}

export interface AssignmentSearchQuery {
    page?: number;
    limit?: number;
    cycleId?: string;
    employeeProfileId?: string;
    managerProfileId?: string;
    departmentId?: string;
    status?: AppraisalAssignmentStatus;
}

export interface RecordSearchQuery {
    page?: number;
    limit?: number;
    cycleId?: string;
    employeeProfileId?: string;
    managerProfileId?: string;
    status?: AppraisalRecordStatus;
}

export interface DisputeSearchQuery {
    page?: number;
    limit?: number;
    cycleId?: string;
    status?: AppraisalDisputeStatus;
    raisedByEmployeeId?: string;
}

@Injectable()
export class PerformanceService {
    constructor(
        @InjectModel(AppraisalTemplate.name) private templateModel: Model<AppraisalTemplateDocument>,
        @InjectModel(AppraisalCycle.name) private cycleModel: Model<AppraisalCycleDocument>,
        @InjectModel(AppraisalAssignment.name) private assignmentModel: Model<AppraisalAssignmentDocument>,
        @InjectModel(AppraisalRecord.name) private recordModel: Model<AppraisalRecordDocument>,
        @InjectModel(AppraisalDispute.name) private disputeModel: Model<AppraisalDisputeDocument>,
        private readonly sharedPerformanceService: SharedPerformanceService,
    ) {}

    private validateObjectId(id: string, fieldName: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ${fieldName} format: ${id}`);
        }
    }

    private createPaginatedResponse<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T> {
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

    async createTemplate(dto: CreateAppraisalTemplateDto): Promise<AppraisalTemplate> {
        const existingByName = await this.templateModel.findOne({ name: dto.name });
        if (existingByName) {
            throw new ConflictException(`Template with name '${dto.name}' already exists`);
        }

        if (dto.criteria && dto.criteria.length > 0) {
            const totalWeight = dto.criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
            if (totalWeight > 0 && totalWeight !== 100) {
                throw new BadRequestException('Criteria weights must sum to 100 or all be 0');
            }
            const keys = dto.criteria.map(c => c.key);
            if (new Set(keys).size !== keys.length) {
                throw new BadRequestException('Criteria keys must be unique');
            }
        }

        const template = await this.templateModel.create({
            name: dto.name,
            description: dto.description,
            templateType: dto.templateType,
            ratingScale: dto.ratingScale,
            criteria: dto.criteria || [],
            instructions: dto.instructions,
            applicableDepartmentIds: dto.applicableDepartmentIds?.map(id => new Types.ObjectId(id)) || [],
            applicablePositionIds: dto.applicablePositionIds?.map(id => new Types.ObjectId(id)) || [],
            isActive: dto.isActive ?? true,
        });

        return template;
    }

    async getTemplateById(id: string): Promise<AppraisalTemplate> {
        this.validateObjectId(id, 'id');
        const template = await this.templateModel.findById(id)
            .populate('applicableDepartmentIds', 'name code')
            .populate('applicablePositionIds', 'title code');
        if (!template) {
            throw new NotFoundException('Template not found');
        }
        return template;
    }

    async updateTemplate(id: string, dto: UpdateAppraisalTemplateDto): Promise<AppraisalTemplate> {
        this.validateObjectId(id, 'id');

        const template = await this.templateModel.findById(id);
        if (!template) {
            throw new NotFoundException('Template not found');
        }

        const inUse = await this.cycleModel.findOne({
            'templateAssignments.templateId': new Types.ObjectId(id),
            status: { $in: [AppraisalCycleStatus.ACTIVE] },
        });
        if (inUse && dto.criteria) {
            throw new BadRequestException('Cannot modify criteria of a template used in an active cycle');
        }

        if (dto.name && dto.name !== template.name) {
            const existingByName = await this.templateModel.findOne({ name: dto.name, _id: { $ne: id } });
            if (existingByName) {
                throw new ConflictException(`Template with name '${dto.name}' already exists`);
            }
        }

        if (dto.criteria && dto.criteria.length > 0) {
            const totalWeight = dto.criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
            if (totalWeight > 0 && totalWeight !== 100) {
                throw new BadRequestException('Criteria weights must sum to 100 or all be 0');
            }
        }

        Object.assign(template, {
            ...dto,
            applicableDepartmentIds: dto.applicableDepartmentIds?.map(id => new Types.ObjectId(id)),
            applicablePositionIds: dto.applicablePositionIds?.map(id => new Types.ObjectId(id)),
        });

        return template.save();
    }

    async deactivateTemplate(id: string): Promise<AppraisalTemplate> {
        this.validateObjectId(id, 'id');

        const template = await this.templateModel.findById(id);
        if (!template) {
            throw new NotFoundException('Template not found');
        }

        if (!template.isActive) {
            throw new BadRequestException('Template is already inactive');
        }

        const inUse = await this.cycleModel.findOne({
            'templateAssignments.templateId': new Types.ObjectId(id),
            status: { $in: [AppraisalCycleStatus.PLANNED, AppraisalCycleStatus.ACTIVE] },
        });
        if (inUse) {
            throw new BadRequestException('Cannot deactivate a template used in planned or active cycles');
        }

        template.isActive = false;
        return template.save();
    }

    async reactivateTemplate(id: string): Promise<AppraisalTemplate> {
        this.validateObjectId(id, 'id');

        const template = await this.templateModel.findById(id);
        if (!template) {
            throw new NotFoundException('Template not found');
        }

        if (template.isActive) {
            throw new BadRequestException('Template is already active');
        }

        template.isActive = true;
        return template.save();
    }

    async searchTemplates(queryDto: TemplateSearchQuery): Promise<PaginatedResult<AppraisalTemplate>> {
        const { page = 1, limit = 20, query, templateType, isActive } = queryDto;
        const skip = (page - 1) * limit;
        const filter: any = {};

        if (query) {
            filter.$or = [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
            ];
        }
        if (templateType) {
            filter.templateType = templateType;
        }
        if (isActive !== undefined) {
            filter.isActive = isActive;
        }

        const [data, total] = await Promise.all([
            this.templateModel.find(filter)
                .populate('applicableDepartmentIds', 'name code')
                .populate('applicablePositionIds', 'title code')
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.templateModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data as AppraisalTemplate[], total, page, limit);
    }

    async getAllTemplates(isActive?: boolean): Promise<AppraisalTemplate[]> {
        const filter: any = {};
        if (isActive !== undefined) {
            filter.isActive = isActive;
        }
        return this.templateModel.find(filter)
            .populate('applicableDepartmentIds', 'name code')
            .populate('applicablePositionIds', 'title code')
            .sort({ name: 1 })
            .lean()
            .exec();
    }

    async getTemplateStats(): Promise<any> {
        const [total, active, byType] = await Promise.all([
            this.templateModel.countDocuments(),
            this.templateModel.countDocuments({ isActive: true }),
            this.templateModel.aggregate([
                { $group: { _id: '$templateType', count: { $sum: 1 } } },
            ]),
        ]);

        return {
            total,
            active,
            inactive: total - active,
            byType: byType.reduce((acc: any, item: any) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
        };
    }

    async createCycle(dto: CreateAppraisalCycleDto): Promise<AppraisalCycle> {
        const existingByName = await this.cycleModel.findOne({ name: dto.name });
        if (existingByName) {
            throw new ConflictException(`Cycle with name '${dto.name}' already exists`);
        }

        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        if (startDate >= endDate) {
            throw new BadRequestException('Start date must be before end date');
        }

        if (dto.managerDueDate) {
            const managerDueDate = new Date(dto.managerDueDate);
            if (managerDueDate < startDate || managerDueDate > endDate) {
                throw new BadRequestException('Manager due date must be within cycle period');
            }
        }

        if (dto.employeeAcknowledgementDueDate) {
            const ackDueDate = new Date(dto.employeeAcknowledgementDueDate);
            if (ackDueDate < startDate || ackDueDate > endDate) {
                throw new BadRequestException('Employee acknowledgement due date must be within cycle period');
            }
        }

        const overlappingCycle = await this.cycleModel.findOne({
            cycleType: dto.cycleType,
            status: { $in: [AppraisalCycleStatus.PLANNED, AppraisalCycleStatus.ACTIVE] },
            $or: [
                { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
            ],
        });
        if (overlappingCycle) {
            throw new ConflictException('An overlapping cycle of the same type already exists');
        }

        if (dto.templateAssignments && dto.templateAssignments.length > 0) {
            for (const ta of dto.templateAssignments) {
                this.validateObjectId(ta.templateId, 'templateId');
                const template = await this.templateModel.findById(ta.templateId);
                if (!template) {
                    throw new NotFoundException(`Template with ID '${ta.templateId}' not found`);
                }
                if (!template.isActive) {
                    throw new BadRequestException(`Template '${template.name}' is inactive`);
                }
            }
        }

        const cycle = await this.cycleModel.create({
            name: dto.name,
            description: dto.description,
            cycleType: dto.cycleType,
            startDate,
            endDate,
            managerDueDate: dto.managerDueDate ? new Date(dto.managerDueDate) : undefined,
            employeeAcknowledgementDueDate: dto.employeeAcknowledgementDueDate ? new Date(dto.employeeAcknowledgementDueDate) : undefined,
            templateAssignments: dto.templateAssignments?.map(ta => ({
                templateId: new Types.ObjectId(ta.templateId),
                departmentIds: ta.departmentIds?.map(id => new Types.ObjectId(id)) || [],
            })) || [],
            status: AppraisalCycleStatus.PLANNED,
        });

        return cycle;
    }

    async getCycleById(id: string): Promise<AppraisalCycle> {
        this.validateObjectId(id, 'id');
        const cycle = await this.cycleModel.findById(id)
            .populate('templateAssignments.templateId', 'name templateType')
            .populate('templateAssignments.departmentIds', 'name code');
        if (!cycle) {
            throw new NotFoundException('Cycle not found');
        }
        return cycle;
    }

    async updateCycle(id: string, dto: UpdateAppraisalCycleDto): Promise<AppraisalCycle> {
        this.validateObjectId(id, 'id');

        const cycle = await this.cycleModel.findById(id);
        if (!cycle) {
            throw new NotFoundException('Cycle not found');
        }

        if (cycle.status !== AppraisalCycleStatus.PLANNED) {
            throw new BadRequestException('Only PLANNED cycles can be updated');
        }

        if (dto.name && dto.name !== cycle.name) {
            const existingByName = await this.cycleModel.findOne({ name: dto.name, _id: { $ne: id } });
            if (existingByName) {
                throw new ConflictException(`Cycle with name '${dto.name}' already exists`);
            }
        }

        if (dto.startDate || dto.endDate) {
            const startDate = dto.startDate ? new Date(dto.startDate) : cycle.startDate;
            const endDate = dto.endDate ? new Date(dto.endDate) : cycle.endDate;
            if (startDate >= endDate) {
                throw new BadRequestException('Start date must be before end date');
            }
        }

        Object.assign(cycle, dto);
        return cycle.save();
    }

    async activateCycle(id: string): Promise<AppraisalCycle> {
        this.validateObjectId(id, 'id');

        const cycle = await this.cycleModel.findById(id);
        if (!cycle) {
            throw new NotFoundException('Cycle not found');
        }

        if (cycle.status !== AppraisalCycleStatus.PLANNED) {
            throw new BadRequestException('Only PLANNED cycles can be activated');
        }

        if (!cycle.templateAssignments || cycle.templateAssignments.length === 0) {
            throw new BadRequestException('Cycle must have at least one template assignment before activation');
        }

        const now = new Date();
        if (cycle.endDate < now) {
            throw new BadRequestException('Cannot activate a cycle that has already ended');
        }

        cycle.status = AppraisalCycleStatus.ACTIVE;
        cycle.publishedAt = now;


        return cycle.save();
    }

    async closeCycle(id: string): Promise<AppraisalCycle> {
        this.validateObjectId(id, 'id');

        const cycle = await this.cycleModel.findById(id);
        if (!cycle) {
            throw new NotFoundException('Cycle not found');
        }

        if (cycle.status !== AppraisalCycleStatus.ACTIVE) {
            throw new BadRequestException('Only ACTIVE cycles can be closed');
        }

        cycle.status = AppraisalCycleStatus.CLOSED;
        cycle.closedAt = new Date();

        return cycle.save();
    }

    async archiveCycle(id: string): Promise<AppraisalCycle> {
        this.validateObjectId(id, 'id');

        const cycle = await this.cycleModel.findById(id);
        if (!cycle) {
            throw new NotFoundException('Cycle not found');
        }

        if (cycle.status !== AppraisalCycleStatus.CLOSED) {
            throw new BadRequestException('Only CLOSED cycles can be archived');
        }

        const openDisputes = await this.disputeModel.countDocuments({
            cycleId: new Types.ObjectId(id),
            status: { $in: [AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW] },
        });

        if (openDisputes > 0) {
            throw new BadRequestException(`Cannot archive cycle with ${openDisputes} unresolved dispute(s)`);
        }

        cycle.status = AppraisalCycleStatus.ARCHIVED;
        cycle.archivedAt = new Date();

        await this.recordModel.updateMany(
            { cycleId: cycle._id },
            { archivedAt: new Date() }
        );

        return cycle.save();
    }

    async searchCycles(queryDto: CycleSearchQuery): Promise<PaginatedResult<AppraisalCycle>> {
        const { page = 1, limit = 20, query, status, cycleType } = queryDto;
        const skip = (page - 1) * limit;
        const filter: any = {};

        if (query) {
            filter.$or = [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
            ];
        }
        if (status) {
            filter.status = status;
        }
        if (cycleType) {
            filter.cycleType = cycleType;
        }

        const [data, total] = await Promise.all([
            this.cycleModel.find(filter)
                .populate('templateAssignments.templateId', 'name templateType')
                .sort({ startDate: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.cycleModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data as AppraisalCycle[], total, page, limit);
    }

    async getAllCycles(status?: AppraisalCycleStatus): Promise<AppraisalCycle[]> {
        const filter: any = {};
        if (status) {
            filter.status = status;
        }
        return this.cycleModel.find(filter)
            .populate('templateAssignments.templateId', 'name templateType')
            .sort({ startDate: -1 })
            .lean()
            .exec();
    }

    async getCycleStats(): Promise<any> {
        const [total, byStatus] = await Promise.all([
            this.cycleModel.countDocuments(),
            this.cycleModel.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
        ]);

        return {
            total,
            byStatus: byStatus.reduce((acc: any, item: any) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
        };
    }

    async createAssignment(dto: CreateAppraisalAssignmentDto): Promise<AppraisalAssignment> {
        this.validateObjectId(dto.cycleId, 'cycleId');
        this.validateObjectId(dto.templateId, 'templateId');
        this.validateObjectId(dto.employeeProfileId, 'employeeProfileId');
        this.validateObjectId(dto.managerProfileId, 'managerProfileId');
        this.validateObjectId(dto.departmentId, 'departmentId');

        const cycle = await this.cycleModel.findById(dto.cycleId);
        if (!cycle) {
            throw new NotFoundException('Cycle not found');
        }

        if (cycle.status !== AppraisalCycleStatus.ACTIVE) {
            throw new BadRequestException('Assignments can only be created for ACTIVE cycles');
        }

        const template = await this.templateModel.findById(dto.templateId);
        if (!template) {
            throw new NotFoundException('Template not found');
        }

        if (!template.isActive) {
            throw new BadRequestException('Cannot assign an inactive template');
        }

        if (dto.employeeProfileId === dto.managerProfileId) {
            throw new BadRequestException('Employee cannot be their own manager for appraisal');
        }

        const existingAssignment = await this.assignmentModel.findOne({
            cycleId: new Types.ObjectId(dto.cycleId),
            employeeProfileId: new Types.ObjectId(dto.employeeProfileId),
        });

        if (existingAssignment) {
            throw new ConflictException('Employee already has an assignment in this cycle');
        }

        if (dto.dueDate) {
            const dueDate = new Date(dto.dueDate);
            if (dueDate < cycle.startDate || dueDate > cycle.endDate) {
                throw new BadRequestException('Due date must be within the cycle period');
            }
        }

        const assignment = await this.assignmentModel.create({
            cycleId: new Types.ObjectId(dto.cycleId),
            templateId: new Types.ObjectId(dto.templateId),
            employeeProfileId: new Types.ObjectId(dto.employeeProfileId),
            managerProfileId: new Types.ObjectId(dto.managerProfileId),
            departmentId: new Types.ObjectId(dto.departmentId),
            positionId: dto.positionId ? new Types.ObjectId(dto.positionId) : undefined,
            status: AppraisalAssignmentStatus.NOT_STARTED,
            assignedAt: new Date(),
            dueDate: dto.dueDate ? new Date(dto.dueDate) : cycle.managerDueDate,
        });

        const employeeProfile = await this.sharedPerformanceService.getEmployeeProfile(dto.employeeProfileId);
        const employeeName = employeeProfile?.fullName || 'Employee';
        await this.sharedPerformanceService.sendAppraisalAssignedNotification(
            dto.employeeProfileId,
            dto.managerProfileId,
            employeeName,
            cycle.name,
            assignment.dueDate
        );

        return assignment;
    }

    async bulkCreateAssignments(dto: BulkCreateAppraisalAssignmentDto): Promise<{ created: number; skipped: number; errors: string[] }> {
        this.validateObjectId(dto.cycleId, 'cycleId');
        this.validateObjectId(dto.templateId, 'templateId');
        this.validateObjectId(dto.departmentId, 'departmentId');

        const cycle = await this.cycleModel.findById(dto.cycleId);
        if (!cycle) {
            throw new NotFoundException('Cycle not found');
        }

        if (cycle.status !== AppraisalCycleStatus.ACTIVE) {
            throw new BadRequestException('Assignments can only be created for ACTIVE cycles');
        }

        const template = await this.templateModel.findById(dto.templateId);
        if (!template) {
            throw new NotFoundException('Template not found');
        }

        if (!template.isActive) {
            throw new BadRequestException('Cannot assign an inactive template');
        }

        const existingAssignments = await this.assignmentModel.find({
            cycleId: new Types.ObjectId(dto.cycleId),
            employeeProfileId: { $in: dto.employeeProfileIds.map(id => new Types.ObjectId(id)) },
        }).select('employeeProfileId');

        const existingEmployeeIds = new Set(existingAssignments.map(a => a.employeeProfileId.toString()));

        const toCreate: any[] = [];
        const errors: string[] = [];
        let skipped = 0;

        for (const employeeId of dto.employeeProfileIds) {
            if (existingEmployeeIds.has(employeeId)) {
                skipped++;
                continue;
            }

            const managerId = await this.sharedPerformanceService.getManagerForEmployee(employeeId);
            toCreate.push({
                cycleId: new Types.ObjectId(dto.cycleId),
                templateId: new Types.ObjectId(dto.templateId),
                employeeProfileId: new Types.ObjectId(employeeId),
                managerProfileId: managerId ? new Types.ObjectId(managerId) : new Types.ObjectId(dto.departmentId),
                departmentId: new Types.ObjectId(dto.departmentId),
                status: AppraisalAssignmentStatus.NOT_STARTED,
                assignedAt: new Date(),
                dueDate: dto.dueDate ? new Date(dto.dueDate) : cycle.managerDueDate,
            });
        }

        if (toCreate.length > 0) {
            await this.assignmentModel.insertMany(toCreate);
        }

        return { created: toCreate.length, skipped, errors };
    }

    async getAssignmentById(id: string): Promise<AppraisalAssignment> {
        this.validateObjectId(id, 'id');
        const assignment = await this.assignmentModel.findById(id)
            .populate('cycleId', 'name status')
            .populate('templateId', 'name templateType')
            .populate('employeeProfileId', 'firstName lastName fullName employeeNumber')
            .populate('managerProfileId', 'firstName lastName fullName employeeNumber')
            .populate('departmentId', 'name code')
            .populate('positionId', 'title code');
        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }
        return assignment;
    }

    async searchAssignments(queryDto: AssignmentSearchQuery): Promise<PaginatedResult<AppraisalAssignment>> {
        const { page = 1, limit = 20, cycleId, employeeProfileId, managerProfileId, departmentId, status } = queryDto;
        const skip = (page - 1) * limit;
        const filter: any = {};

        if (cycleId) {
            this.validateObjectId(cycleId, 'cycleId');
            filter.cycleId = new Types.ObjectId(cycleId);
        }
        if (employeeProfileId) {
            this.validateObjectId(employeeProfileId, 'employeeProfileId');
            filter.employeeProfileId = new Types.ObjectId(employeeProfileId);
        }
        if (managerProfileId) {
            this.validateObjectId(managerProfileId, 'managerProfileId');
            filter.managerProfileId = new Types.ObjectId(managerProfileId);
        }
        if (departmentId) {
            this.validateObjectId(departmentId, 'departmentId');
            filter.departmentId = new Types.ObjectId(departmentId);
        }
        if (status) {
            filter.status = status;
        }

        const [data, total] = await Promise.all([
            this.assignmentModel.find(filter)
                .populate('cycleId', 'name status')
                .populate('templateId', 'name templateType')
                .populate('employeeProfileId', 'firstName lastName fullName employeeNumber')
                .populate('managerProfileId', 'firstName lastName fullName employeeNumber')
                .populate('departmentId', 'name code')
                .sort({ assignedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.assignmentModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data as AppraisalAssignment[], total, page, limit);
    }

    async getAssignmentsForManager(managerProfileId: string): Promise<AppraisalAssignment[]> {
        this.validateObjectId(managerProfileId, 'managerProfileId');
        return this.assignmentModel.find({
            managerProfileId: new Types.ObjectId(managerProfileId),
            status: { $in: [AppraisalAssignmentStatus.NOT_STARTED, AppraisalAssignmentStatus.IN_PROGRESS, AppraisalAssignmentStatus.SUBMITTED] },
        })
            .populate('cycleId', 'name status')
            .populate('templateId', 'name templateType')
            .populate('employeeProfileId', 'firstName lastName fullName employeeNumber')
            .populate('departmentId', 'name code')
            .sort({ dueDate: 1 })
            .lean()
            .exec();
    }

    async getAssignmentsForEmployee(employeeProfileId: string): Promise<AppraisalAssignment[]> {
        this.validateObjectId(employeeProfileId, 'employeeProfileId');
        return this.assignmentModel.find({
            employeeProfileId: new Types.ObjectId(employeeProfileId),
        })
            .populate('cycleId', 'name status')
            .populate('templateId', 'name templateType')
            .populate('managerProfileId', 'firstName lastName fullName employeeNumber')
            .populate('departmentId', 'name code')
            .sort({ assignedAt: -1 })
            .lean()
            .exec();
    }

    async submitAppraisalRecord(dto: SubmitAppraisalRecordDto): Promise<AppraisalRecord> {
        this.validateObjectId(dto.assignmentId, 'assignmentId');

        const assignment = await this.assignmentModel.findById(dto.assignmentId);
        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        const cycle = await this.cycleModel.findById(assignment.cycleId);
        if (!cycle || cycle.status !== AppraisalCycleStatus.ACTIVE) {
            throw new BadRequestException('Cannot submit appraisal for an inactive cycle');
        }

        let record = await this.recordModel.findOne({
            assignmentId: new Types.ObjectId(dto.assignmentId),
        });

        if (record) {
            if (record.status === AppraisalRecordStatus.HR_PUBLISHED) {
                throw new BadRequestException('Cannot modify a published appraisal record');
            }
            if (record.status === AppraisalRecordStatus.ARCHIVED) {
                throw new BadRequestException('Cannot modify an archived appraisal record');
            }

            record.ratings = dto.ratings;
            record.totalScore = dto.totalScore;
            record.overallRatingLabel = dto.overallRatingLabel;
            record.managerSummary = dto.managerSummary;
            record.strengths = dto.strengths;
            record.improvementAreas = dto.improvementAreas;
            record.status = AppraisalRecordStatus.MANAGER_SUBMITTED;
            record.managerSubmittedAt = new Date();
        } else {
            record = new this.recordModel({
                assignmentId: new Types.ObjectId(dto.assignmentId),
                cycleId: assignment.cycleId,
                templateId: assignment.templateId,
                employeeProfileId: assignment.employeeProfileId,
                managerProfileId: assignment.managerProfileId,
                ratings: dto.ratings,
                totalScore: dto.totalScore,
                overallRatingLabel: dto.overallRatingLabel,
                managerSummary: dto.managerSummary,
                strengths: dto.strengths,
                improvementAreas: dto.improvementAreas,
                status: AppraisalRecordStatus.MANAGER_SUBMITTED,
                managerSubmittedAt: new Date(),
            });
        }

        assignment.status = AppraisalAssignmentStatus.SUBMITTED;
        assignment.submittedAt = new Date();
        assignment.latestAppraisalId = record._id as Types.ObjectId;
        await assignment.save();

        return record.save();
    }

    async saveDraftRecord(dto: SubmitAppraisalRecordDto): Promise<AppraisalRecord> {
        this.validateObjectId(dto.assignmentId, 'assignmentId');

        const assignment = await this.assignmentModel.findById(dto.assignmentId);
        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        let record = await this.recordModel.findOne({
            assignmentId: new Types.ObjectId(dto.assignmentId),
        });

        if (record) {
            if (record.status !== AppraisalRecordStatus.DRAFT) {
                throw new BadRequestException('Can only save draft for records in DRAFT status');
            }

            Object.assign(record, {
                ratings: dto.ratings,
                totalScore: dto.totalScore,
                overallRatingLabel: dto.overallRatingLabel,
                managerSummary: dto.managerSummary,
                strengths: dto.strengths,
                improvementAreas: dto.improvementAreas,
            });
        } else {
            record = new this.recordModel({
                assignmentId: new Types.ObjectId(dto.assignmentId),
                cycleId: assignment.cycleId,
                templateId: assignment.templateId,
                employeeProfileId: assignment.employeeProfileId,
                managerProfileId: assignment.managerProfileId,
                ratings: dto.ratings,
                totalScore: dto.totalScore,
                overallRatingLabel: dto.overallRatingLabel,
                managerSummary: dto.managerSummary,
                strengths: dto.strengths,
                improvementAreas: dto.improvementAreas,
                status: AppraisalRecordStatus.DRAFT,
            });

            assignment.status = AppraisalAssignmentStatus.IN_PROGRESS;
            await assignment.save();
        }

        return record.save();
    }

    async getRecordById(id: string): Promise<AppraisalRecord> {
        this.validateObjectId(id, 'id');
        const record = await this.recordModel.findById(id)
            .populate('cycleId', 'name status')
            .populate('templateId', 'name templateType criteria')
            .populate('employeeProfileId', 'firstName lastName fullName employeeNumber')
            .populate('managerProfileId', 'firstName lastName fullName employeeNumber')
            .populate('publishedByEmployeeId', 'firstName lastName fullName');
        if (!record) {
            throw new NotFoundException('Record not found');
        }
        return record;
    }

    async getRecordByAssignment(assignmentId: string): Promise<AppraisalRecord | null> {
        this.validateObjectId(assignmentId, 'assignmentId');
        return this.recordModel.findOne({ assignmentId: new Types.ObjectId(assignmentId) })
            .populate('cycleId', 'name status')
            .populate('templateId', 'name templateType criteria')
            .populate('employeeProfileId', 'firstName lastName fullName employeeNumber')
            .populate('managerProfileId', 'firstName lastName fullName employeeNumber');
    }

    async publishRecord(id: string, publishedByEmployeeId: string): Promise<AppraisalRecord> {
        this.validateObjectId(id, 'id');
        this.validateObjectId(publishedByEmployeeId, 'publishedByEmployeeId');

        const record = await this.recordModel.findById(id);
        if (!record) {
            throw new NotFoundException('Record not found');
        }

        if (record.status !== AppraisalRecordStatus.MANAGER_SUBMITTED) {
            throw new BadRequestException('Only MANAGER_SUBMITTED records can be published');
        }

        record.status = AppraisalRecordStatus.HR_PUBLISHED;
        record.hrPublishedAt = new Date();
        record.publishedByEmployeeId = new Types.ObjectId(publishedByEmployeeId);

        const assignment = await this.assignmentModel.findById(record.assignmentId);
        if (assignment) {
            assignment.status = AppraisalAssignmentStatus.PUBLISHED;
            assignment.publishedAt = new Date();
            await assignment.save();
        }

        const cycle = await this.cycleModel.findById(record.cycleId);
        const cycleName = cycle?.name || 'Appraisal Cycle';

        await this.sharedPerformanceService.sendAppraisalPublishedNotification(
            record.employeeProfileId.toString(),
            cycleName,
            record.overallRatingLabel || String(record.totalScore)
        );

        await this.sharedPerformanceService.updateEmployeeLastAppraisal(
            record.employeeProfileId.toString(),
            record._id.toString(),
            record.cycleId.toString(),
            record.templateId.toString()
        );

        return record.save();
    }

    async bulkPublishRecords(recordIds: string[], publishedByEmployeeId: string): Promise<{ published: number; errors: string[] }> {
        this.validateObjectId(publishedByEmployeeId, 'publishedByEmployeeId');

        let published = 0;
        const errors: string[] = [];

        for (const id of recordIds) {
            try {
                await this.publishRecord(id, publishedByEmployeeId);
                published++;
            } catch (error: any) {
                errors.push(`${id}: ${error.message}`);
            }
        }

        return { published, errors };
    }

    async acknowledgeRecord(id: string, comment?: string): Promise<AppraisalRecord> {
        this.validateObjectId(id, 'id');

        const record = await this.recordModel.findById(id);
        if (!record) {
            throw new NotFoundException('Record not found');
        }

        if (record.status !== AppraisalRecordStatus.HR_PUBLISHED) {
            throw new BadRequestException('Only HR_PUBLISHED records can be acknowledged');
        }

        record.employeeViewedAt = record.employeeViewedAt || new Date();
        record.employeeAcknowledgedAt = new Date();
        record.employeeAcknowledgementComment = comment;

        const assignment = await this.assignmentModel.findById(record.assignmentId);
        if (assignment) {
            assignment.status = AppraisalAssignmentStatus.ACKNOWLEDGED;
            await assignment.save();
        }

        return record.save();
    }

    async markRecordViewed(id: string): Promise<AppraisalRecord> {
        this.validateObjectId(id, 'id');

        const record = await this.recordModel.findById(id);
        if (!record) {
            throw new NotFoundException('Record not found');
        }

        if (record.status !== AppraisalRecordStatus.HR_PUBLISHED) {
            throw new BadRequestException('Only HR_PUBLISHED records can be viewed');
        }

        if (!record.employeeViewedAt) {
            record.employeeViewedAt = new Date();
            await record.save();
        }

        return record;
    }

    async searchRecords(queryDto: RecordSearchQuery): Promise<PaginatedResult<AppraisalRecord>> {
        const { page = 1, limit = 20, cycleId, employeeProfileId, managerProfileId, status } = queryDto;
        const skip = (page - 1) * limit;
        const filter: any = {};

        if (cycleId) {
            this.validateObjectId(cycleId, 'cycleId');
            filter.cycleId = new Types.ObjectId(cycleId);
        }
        if (employeeProfileId) {
            this.validateObjectId(employeeProfileId, 'employeeProfileId');
            filter.employeeProfileId = new Types.ObjectId(employeeProfileId);
        }
        if (managerProfileId) {
            this.validateObjectId(managerProfileId, 'managerProfileId');
            filter.managerProfileId = new Types.ObjectId(managerProfileId);
        }
        if (status) {
            filter.status = status;
        }

        const [data, total] = await Promise.all([
            this.recordModel.find(filter)
                .populate('cycleId', 'name status')
                .populate('templateId', 'name templateType')
                .populate('employeeProfileId', 'firstName lastName fullName employeeNumber')
                .populate('managerProfileId', 'firstName lastName fullName employeeNumber')
                .sort({ managerSubmittedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.recordModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data as AppraisalRecord[], total, page, limit);
    }

    async getEmployeeAppraisalHistory(employeeProfileId: string): Promise<AppraisalRecord[]> {
        this.validateObjectId(employeeProfileId, 'employeeProfileId');
        return this.recordModel.find({
            employeeProfileId: new Types.ObjectId(employeeProfileId),
            status: { $in: [AppraisalRecordStatus.HR_PUBLISHED, AppraisalRecordStatus.ARCHIVED] },
        })
            .populate('cycleId', 'name cycleType startDate endDate')
            .populate('templateId', 'name templateType')
            .populate('managerProfileId', 'firstName lastName fullName')
            .sort({ hrPublishedAt: -1 })
            .lean()
            .exec();
    }

    async getEmployeeCurrentAppraisal(employeeProfileId: string): Promise<AppraisalRecord | null> {
        this.validateObjectId(employeeProfileId, 'employeeProfileId');

        // Find the most recent in-progress or draft appraisal
        return this.recordModel.findOne({
            employeeProfileId: new Types.ObjectId(employeeProfileId),
            status: { $in: [AppraisalRecordStatus.DRAFT, AppraisalRecordStatus.MANAGER_SUBMITTED] },
        })
            .populate('cycleId', 'name cycleType startDate endDate')
            .populate('templateId', 'name templateType')
            .populate('managerProfileId', 'firstName lastName fullName')
            .populate('assignmentId')
            .sort({ createdAt: -1 })
            .lean()
            .exec();
    }

    async getEmployeeGoals(employeeProfileId: string): Promise<any[]> {
        this.validateObjectId(employeeProfileId, 'employeeProfileId');

        // Get goals from current active appraisal assignments
        const assignments = await this.assignmentModel.find({
            employeeProfileId: new Types.ObjectId(employeeProfileId),
            status: { $in: [AppraisalAssignmentStatus.IN_PROGRESS, AppraisalAssignmentStatus.NOT_STARTED] },
        })
            .populate('cycleId', 'name cycleType startDate endDate')
            .populate('templateId', 'name sections')
            .lean()
            .exec();

        // Extract goals from templates if they have goal sections
        const goals: any[] = [];
        for (const assignment of assignments) {
            const template = assignment.templateId as any;
            if (template?.sections) {
                for (const section of template.sections) {
                    if (section.name?.toLowerCase().includes('goal') ||
                        section.name?.toLowerCase().includes('objective')) {
                        goals.push({
                            cycleId: assignment.cycleId,
                            assignmentId: assignment._id,
                            sectionName: section.name,
                            criteria: section.criteria || [],
                            dueDate: assignment.dueDate,
                        });
                    }
                }
            }
        }

        return goals;
    }

    async fileDispute(dto: FileAppraisalDisputeDto): Promise<AppraisalDispute> {
        this.validateObjectId(dto.appraisalId, 'appraisalId');
        this.validateObjectId(dto.assignmentId, 'assignmentId');
        this.validateObjectId(dto.cycleId, 'cycleId');
        this.validateObjectId(dto.raisedByEmployeeId, 'raisedByEmployeeId');

        const record = await this.recordModel.findById(dto.appraisalId);
        if (!record) {
            throw new NotFoundException('Appraisal record not found');
        }

        if (record.status !== AppraisalRecordStatus.HR_PUBLISHED) {
            throw new BadRequestException('Disputes can only be filed for published appraisals');
        }

        if (record.employeeProfileId.toString() !== dto.raisedByEmployeeId) {
            throw new BadRequestException('Only the appraised employee can file a dispute');
        }

        const publishDate = record.hrPublishedAt ? new Date(record.hrPublishedAt) : new Date();
        const disputeWindowClosesAt = new Date(publishDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        if (new Date() > disputeWindowClosesAt) {
            throw new BadRequestException('Dispute window has closed (7 days after publication)');
        }

        const existingDispute = await this.disputeModel.findOne({
            appraisalId: new Types.ObjectId(dto.appraisalId),
            status: { $in: [AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW] },
        });

        if (existingDispute) {
            throw new ConflictException('A dispute is already open for this appraisal');
        }

        const dispute = await this.disputeModel.create({
            appraisalId: new Types.ObjectId(dto.appraisalId),
            assignmentId: new Types.ObjectId(dto.assignmentId),
            cycleId: new Types.ObjectId(dto.cycleId),
            raisedByEmployeeId: new Types.ObjectId(dto.raisedByEmployeeId),
            reason: dto.reason,
            details: dto.details,
            submittedAt: new Date(),
            status: AppraisalDisputeStatus.OPEN,
        });

        const employeeProfile = await this.sharedPerformanceService.getEmployeeProfile(dto.raisedByEmployeeId);
        const employeeName = employeeProfile?.fullName || 'Employee';
        await this.sharedPerformanceService.sendDisputeFiledNotification(
            dto.raisedByEmployeeId,
            employeeName,
            dispute._id.toString()
        );

        return dispute;
    }

    async getDisputeById(id: string): Promise<AppraisalDispute> {
        this.validateObjectId(id, 'id');
        const dispute = await this.disputeModel.findById(id)
            .populate('appraisalId')
            .populate('raisedByEmployeeId', 'firstName lastName fullName employeeNumber')
            .populate('assignedReviewerEmployeeId', 'firstName lastName fullName')
            .populate('resolvedByEmployeeId', 'firstName lastName fullName');
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }
        return dispute;
    }

    async assignDisputeReviewer(id: string, reviewerEmployeeId: string): Promise<AppraisalDispute> {
        this.validateObjectId(id, 'id');
        this.validateObjectId(reviewerEmployeeId, 'reviewerEmployeeId');

        const dispute = await this.disputeModel.findById(id);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        if (dispute.status !== AppraisalDisputeStatus.OPEN) {
            throw new BadRequestException('Can only assign reviewer to OPEN disputes');
        }

        if (dispute.raisedByEmployeeId.toString() === reviewerEmployeeId) {
            throw new BadRequestException('The employee who raised the dispute cannot be the reviewer');
        }

        dispute.assignedReviewerEmployeeId = new Types.ObjectId(reviewerEmployeeId);
        dispute.status = AppraisalDisputeStatus.UNDER_REVIEW;


        return dispute.save();
    }

    async resolveDispute(dto: ResolveAppraisalDisputeDto): Promise<AppraisalDispute> {
        this.validateObjectId(dto.disputeId, 'disputeId');
        this.validateObjectId(dto.resolvedByEmployeeId, 'resolvedByEmployeeId');

        const dispute = await this.disputeModel.findById(dto.disputeId);
        if (!dispute) {
            throw new NotFoundException('Dispute not found');
        }

        if (![AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW].includes(dispute.status)) {
            throw new BadRequestException('Dispute has already been resolved');
        }

        if (![AppraisalDisputeStatus.ADJUSTED, AppraisalDisputeStatus.REJECTED].includes(dto.status as AppraisalDisputeStatus)) {
            throw new BadRequestException('Invalid resolution status');
        }

        if (!dto.resolutionSummary) {
            throw new BadRequestException('Resolution summary is required');
        }

        dispute.status = dto.status as AppraisalDisputeStatus;
        dispute.resolutionSummary = dto.resolutionSummary;
        dispute.resolvedByEmployeeId = new Types.ObjectId(dto.resolvedByEmployeeId);
        dispute.resolvedAt = new Date();

        await this.sharedPerformanceService.sendDisputeResolvedNotification(
            dispute.raisedByEmployeeId.toString(),
            dispute._id.toString(),
            dto.status,
            dto.resolutionSummary
        );

        if (dto.status === AppraisalDisputeStatus.ADJUSTED) {
            const record = await this.recordModel.findById(dispute.appraisalId);
            if (record) {
                record.status = AppraisalRecordStatus.MANAGER_SUBMITTED;
                await record.save();

                const assignment = await this.assignmentModel.findById(record.assignmentId);
                if (assignment) {
                    assignment.status = AppraisalAssignmentStatus.SUBMITTED;
                    await assignment.save();
                }
            }
        }

        return dispute.save();
    }

    async searchDisputes(queryDto: DisputeSearchQuery): Promise<PaginatedResult<AppraisalDispute>> {
        const { page = 1, limit = 20, cycleId, status, raisedByEmployeeId } = queryDto;
        const skip = (page - 1) * limit;
        const filter: any = {};

        if (cycleId) {
            this.validateObjectId(cycleId, 'cycleId');
            filter.cycleId = new Types.ObjectId(cycleId);
        }
        if (status) {
            filter.status = status;
        }
        if (raisedByEmployeeId) {
            this.validateObjectId(raisedByEmployeeId, 'raisedByEmployeeId');
            filter.raisedByEmployeeId = new Types.ObjectId(raisedByEmployeeId);
        }

        const [data, total] = await Promise.all([
            this.disputeModel.find(filter)
                .populate('appraisalId', 'totalScore overallRatingLabel')
                .populate('raisedByEmployeeId', 'firstName lastName fullName employeeNumber')
                .populate('assignedReviewerEmployeeId', 'firstName lastName fullName')
                .sort({ submittedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.disputeModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data as AppraisalDispute[], total, page, limit);
    }

    async getDisputeStats(cycleId?: string): Promise<any> {
        const filter: any = {};
        if (cycleId) {
            this.validateObjectId(cycleId, 'cycleId');
            filter.cycleId = new Types.ObjectId(cycleId);
        }

        const [total, byStatus] = await Promise.all([
            this.disputeModel.countDocuments(filter),
            this.disputeModel.aggregate([
                { $match: filter },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
        ]);

        return {
            total,
            byStatus: byStatus.reduce((acc: any, item: any) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
        };
    }

    async getCompletionDashboard(cycleId: string): Promise<any> {
        this.validateObjectId(cycleId, 'cycleId');

        const cycle = await this.cycleModel.findById(cycleId);
        if (!cycle) {
            throw new NotFoundException('Cycle not found');
        }

        const [totalAssignments, statusBreakdown, departmentMetrics] = await Promise.all([
            this.assignmentModel.countDocuments({ cycleId: new Types.ObjectId(cycleId) }),
            this.assignmentModel.aggregate([
                { $match: { cycleId: new Types.ObjectId(cycleId) } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            this.assignmentModel.aggregate([
                { $match: { cycleId: new Types.ObjectId(cycleId) } },
                {
                    $group: {
                        _id: '$departmentId',
                        total: { $sum: 1 },
                        notStarted: { $sum: { $cond: [{ $eq: ['$status', AppraisalAssignmentStatus.NOT_STARTED] }, 1, 0] } },
                        inProgress: { $sum: { $cond: [{ $eq: ['$status', AppraisalAssignmentStatus.IN_PROGRESS] }, 1, 0] } },
                        submitted: { $sum: { $cond: [{ $eq: ['$status', AppraisalAssignmentStatus.SUBMITTED] }, 1, 0] } },
                        published: { $sum: { $cond: [{ $eq: ['$status', AppraisalAssignmentStatus.PUBLISHED] }, 1, 0] } },
                        acknowledged: { $sum: { $cond: [{ $eq: ['$status', AppraisalAssignmentStatus.ACKNOWLEDGED] }, 1, 0] } },
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
                { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        departmentId: '$_id',
                        departmentName: '$department.name',
                        departmentCode: '$department.code',
                        total: 1,
                        notStarted: 1,
                        inProgress: 1,
                        submitted: 1,
                        published: 1,
                        acknowledged: 1,
                        completionPercentage: {
                            $multiply: [{ $divide: [{ $add: ['$published', '$acknowledged'] }, '$total'] }, 100],
                        },
                        _id: 0,
                    },
                },
            ]),
        ]);

        const statusMap = statusBreakdown.reduce((acc: any, item: any) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        return {
            cycle: {
                _id: cycle._id,
                name: cycle.name,
                status: cycle.status,
                startDate: cycle.startDate,
                endDate: cycle.endDate,
            },
            summary: {
                total: totalAssignments,
                notStarted: statusMap[AppraisalAssignmentStatus.NOT_STARTED] || 0,
                inProgress: statusMap[AppraisalAssignmentStatus.IN_PROGRESS] || 0,
                submitted: statusMap[AppraisalAssignmentStatus.SUBMITTED] || 0,
                published: statusMap[AppraisalAssignmentStatus.PUBLISHED] || 0,
                acknowledged: statusMap[AppraisalAssignmentStatus.ACKNOWLEDGED] || 0,
                overallCompletion: totalAssignments > 0
                    ? Math.round(((statusMap[AppraisalAssignmentStatus.PUBLISHED] || 0) + (statusMap[AppraisalAssignmentStatus.ACKNOWLEDGED] || 0)) / totalAssignments * 100)
                    : 0,
            },
            departmentMetrics,
        };
    }

    @Cron('0 0 * * *')
    async archiveCompletedCycles(): Promise<void> {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const cyclesToArchive = await this.cycleModel.find({
            status: AppraisalCycleStatus.CLOSED,
            closedAt: { $lte: thirtyDaysAgo },
        });

        for (const cycle of cyclesToArchive) {
            const openDisputes = await this.disputeModel.countDocuments({
                cycleId: cycle._id,
                status: { $in: [AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW] },
            });

            if (openDisputes === 0) {
                cycle.status = AppraisalCycleStatus.ARCHIVED;
                cycle.archivedAt = new Date();
                await cycle.save();

                await this.recordModel.updateMany(
                    { cycleId: cycle._id },
                    { archivedAt: new Date() }
                );
            }
        }
    }
}
