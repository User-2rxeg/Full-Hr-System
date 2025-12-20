import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from '../models/organization-structure/department.schema';
import { Position, PositionDocument } from '../models/organization-structure/position.schema';
import { PositionAssignment, PositionAssignmentDocument } from '../models/organization-structure/position-assignment.schema';
import { StructureChangeRequest, StructureChangeRequestDocument } from '../models/organization-structure/structure-change-request.schema';
import { StructureApproval, StructureApprovalDocument } from '../models/organization-structure/structure-approval.schema';
import { StructureChangeLog, StructureChangeLogDocument } from '../models/organization-structure/structure-change-log.schema';
import { ApprovalDecision, ChangeLogAction, StructureRequestStatus, StructureRequestType } from '../enums/organization-structure.enums';
import { CreateDepartmentDto, UpdateDepartmentDto, CreatePositionDto, UpdatePositionDto, AssignPositionDto, EndAssignmentDto, SubmitStructureRequestDto, UpdateStructureRequestDto, SubmitApprovalDecisionDto } from '../dto/organization-structure';
import { SharedOrganizationService } from '../../shared/services/shared-organization.service';

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

export interface PaginationQuery {
    page?: number;
    limit?: number;
}

export interface DepartmentSearchQuery extends PaginationQuery {
    isActive?: boolean;
    query?: string;
}

export interface PositionSearchQuery extends PaginationQuery {
    departmentId?: string;
    isActive?: boolean;
    query?: string;
}

export interface AssignmentSearchQuery extends PaginationQuery {
    employeeProfileId?: string;
    positionId?: string;
    departmentId?: string;
    activeOnly?: boolean;
}

export interface ChangeRequestSearchQuery extends PaginationQuery {
    status?: StructureRequestStatus;
    requestType?: StructureRequestType;
    requestedByEmployeeId?: string;
}

@Injectable()
export class OrganizationStructureService {
    constructor(
        @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
        @InjectModel(Position.name) private positionModel: Model<PositionDocument>,
        @InjectModel(PositionAssignment.name) private assignmentModel: Model<PositionAssignmentDocument>,
        @InjectModel(StructureChangeRequest.name) private changeRequestModel: Model<StructureChangeRequestDocument>,
        @InjectModel(StructureApproval.name) private approvalModel: Model<StructureApprovalDocument>,
        @InjectModel(StructureChangeLog.name) private changeLogModel: Model<StructureChangeLogDocument>,
        private readonly sharedOrganizationService: SharedOrganizationService,
    ) { }

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

    private generateRequestNumber(): string {
        return `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }

    private async logChange(params: {
        action: ChangeLogAction;
        entityType: string;
        entityId: Types.ObjectId;
        performedByEmployeeId?: string;
        summary?: string;
        before?: any;
        after?: any;
    }): Promise<void> {
        await this.changeLogModel.create({
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            performedByEmployeeId: params.performedByEmployeeId ? new Types.ObjectId(params.performedByEmployeeId) : undefined,
            summary: params.summary,
            beforeSnapshot: params.before,
            afterSnapshot: params.after,
        });
    }

    async createDepartment(dto: CreateDepartmentDto, performedBy?: string): Promise<Department> {
        const existingByCode = await this.departmentModel.findOne({ code: dto.code });
        if (existingByCode) {
            throw new ConflictException(`Department with code '${dto.code}' already exists`);
        }

        const existingByName = await this.departmentModel.findOne({ name: dto.name });
        if (existingByName) {
            throw new ConflictException(`Department with name '${dto.name}' already exists`);
        }

        if (dto.headPositionId) {
            throw new BadRequestException('Cannot set head position when creating a department. Create the department first, then create positions, then update the department with the head position.');
        }

        const department = await this.departmentModel.create({
            code: dto.code,
            name: dto.name,
            description: dto.description,
            isActive: dto.isActive ?? true,
        });

        await this.logChange({
            action: ChangeLogAction.CREATED,
            entityType: 'Department',
            entityId: department._id as Types.ObjectId,
            performedByEmployeeId: performedBy,
            summary: `Created department: ${department.name}`,
            after: department.toObject(),
        });

        return department;


    }

    async getDepartmentById(id: string): Promise<Department> {
        this.validateObjectId(id, 'id');
        const department = await this.departmentModel.findById(id).populate('headPositionId');
        if (!department) {
            throw new NotFoundException('Department not found');
        }
        return department;
    }

    async updateDepartment(id: string, dto: UpdateDepartmentDto, performedBy?: string): Promise<Department> {
        this.validateObjectId(id, 'id');

        const department = await this.departmentModel.findById(id);
        if (!department) {
            throw new NotFoundException('Department not found');
        }

        const beforeSnapshot = department.toObject();

        if (dto.code && dto.code !== department.code) {
            const existingByCode = await this.departmentModel.findOne({ code: dto.code, _id: { $ne: id } });
            if (existingByCode) {
                throw new ConflictException(`Department with code '${dto.code}' already exists`);
            }
        }

        if (dto.name && dto.name !== department.name) {
            const existingByName = await this.departmentModel.findOne({ name: dto.name, _id: { $ne: id } });
            if (existingByName) {
                throw new ConflictException(`Department with name '${dto.name}' already exists`);
            }
        }

        if (dto.headPositionId) {
            this.validateObjectId(dto.headPositionId, 'headPositionId');
            const position = await this.positionModel.findById(dto.headPositionId);
            if (!position) {
                throw new NotFoundException('Head position not found');
            }
            if (!position.isActive) {
                throw new BadRequestException('Cannot assign an inactive position as department head');
            }
            if (position.departmentId.toString() !== id) {
                throw new BadRequestException('Head position must belong to this department');
            }
        }

        Object.assign(department, dto);
        const updatedDepartment = await department.save();

        await this.logChange({
            action: ChangeLogAction.UPDATED,
            entityType: 'Department',
            entityId: department._id as Types.ObjectId,
            performedByEmployeeId: performedBy,
            summary: `Updated department: ${department.name}`,
            before: beforeSnapshot,
            after: updatedDepartment.toObject(),
        });

        return updatedDepartment;
    }

    async deactivateDepartment(id: string, performedBy?: string): Promise<Department> {
        this.validateObjectId(id, 'id');

        const department = await this.departmentModel.findById(id);
        if (!department) {
            throw new NotFoundException('Department not found');
        }

        if (!department.isActive) {
            throw new BadRequestException('Department is already inactive');
        }

        const activePositions = await this.positionModel.countDocuments({ departmentId: id, isActive: true });
        if (activePositions > 0) {
            throw new BadRequestException(`Cannot deactivate department with ${activePositions} active position(s). Deactivate all positions first.`);
        }

        const beforeSnapshot = department.toObject();
        department.isActive = false;
        const updatedDepartment = await department.save();

        await this.logChange({
            action: ChangeLogAction.DEACTIVATED,
            entityType: 'Department',
            entityId: department._id as Types.ObjectId,
            performedByEmployeeId: performedBy,
            summary: `Deactivated department: ${department.name}`,
            before: beforeSnapshot,
            after: updatedDepartment.toObject(),
        });

        return updatedDepartment;
    }

    async reactivateDepartment(id: string, performedBy?: string): Promise<Department> {
        this.validateObjectId(id, 'id');

        const department = await this.departmentModel.findById(id);
        if (!department) {
            throw new NotFoundException('Department not found');
        }

        if (department.isActive) {
            throw new BadRequestException('Department is already active');
        }

        const beforeSnapshot = department.toObject();
        department.isActive = true;
        const updatedDepartment = await department.save();

        await this.logChange({
            action: ChangeLogAction.UPDATED,
            entityType: 'Department',
            entityId: department._id as Types.ObjectId,
            performedByEmployeeId: performedBy,
            summary: `Reactivated department: ${department.name}`,
            before: beforeSnapshot,
            after: updatedDepartment.toObject(),
        });

        return updatedDepartment;
    }

    async searchDepartments(queryDto: DepartmentSearchQuery): Promise<PaginatedResult<Department>> {
        const { page = 1, limit = 20, isActive, query } = queryDto;
        const skip = (page - 1) * limit;
        const filter: any = {};

        if (isActive !== undefined) {
            filter.isActive = isActive;
        }

        if (query && query.trim()) {
            filter.$or = [
                { code: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.departmentModel.find(filter)
                .populate('headPositionId', 'title code')
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.departmentModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data as Department[], total, page, limit);
    }

    async getAllDepartments(isActive?: boolean): Promise<Department[]> {
        const filter: any = {};
        if (isActive !== undefined) {
            filter.isActive = isActive;
        }
        return this.departmentModel.find(filter).populate('headPositionId', 'title code').sort({ name: 1 }).lean().exec();
    }

    async createPosition(dto: CreatePositionDto, performedBy?: string): Promise<Position> {
        const existingByCode = await this.positionModel.findOne({ code: dto.code });
        if (existingByCode) {
            throw new ConflictException(`Position with code '${dto.code}' already exists`);
        }

        this.validateObjectId(dto.departmentId, 'departmentId');
        const department = await this.departmentModel.findById(dto.departmentId);
        if (!department) {
            throw new NotFoundException('Department not found');
        }

        if (!department.isActive) {
            throw new BadRequestException('Cannot create position in an inactive department');
        }

        if (dto.reportsToPositionId) {
            this.validateObjectId(dto.reportsToPositionId, 'reportsToPositionId');
            const reportsToPosition = await this.positionModel.findById(dto.reportsToPositionId);
            if (!reportsToPosition) {
                throw new NotFoundException('Reports-to position not found');
            }
            if (!reportsToPosition.isActive) {
                throw new BadRequestException('Cannot report to an inactive position');
            }
        }

        const position = await this.positionModel.create({
            ...dto,
            departmentId: new Types.ObjectId(dto.departmentId),
            reportsToPositionId: dto.reportsToPositionId ? new Types.ObjectId(dto.reportsToPositionId) : undefined,
        });

        await this.logChange({
            action: ChangeLogAction.CREATED,
            entityType: 'Position',
            entityId: position._id as Types.ObjectId,
            performedByEmployeeId: performedBy,
            summary: `Created position: ${position.title}`,
            after: position.toObject(),
        });

        return position;
    }

    async getPositionById(id: string): Promise<Position> {
        this.validateObjectId(id, 'id');
        const position = await this.positionModel.findById(id)
            .populate('departmentId', 'name code')
            .populate('reportsToPositionId', 'title code');
        if (!position) {
            throw new NotFoundException('Position not found');
        }
        return position;
    }

    async updatePosition(id: string, dto: UpdatePositionDto, performedBy?: string): Promise<Position> {
        this.validateObjectId(id, 'id');

        const position = await this.positionModel.findById(id);
        if (!position) {
            throw new NotFoundException('Position not found');
        }

        const beforeSnapshot = position.toObject();

        if (dto.code && dto.code !== position.code) {
            const existingByCode = await this.positionModel.findOne({ code: dto.code, _id: { $ne: id } });
            if (existingByCode) {
                throw new ConflictException(`Position with code '${dto.code}' already exists`);
            }
        }

        if (dto.departmentId) {
            this.validateObjectId(dto.departmentId, 'departmentId');
            const department = await this.departmentModel.findById(dto.departmentId);
            if (!department) {
                throw new NotFoundException('Department not found');
            }
            if (!department.isActive) {
                throw new BadRequestException('Cannot move position to an inactive department');
            }
        }

        if (dto.reportsToPositionId) {
            this.validateObjectId(dto.reportsToPositionId, 'reportsToPositionId');
            if (dto.reportsToPositionId === id) {
                throw new BadRequestException('Position cannot report to itself');
            }
            const reportsToPosition = await this.positionModel.findById(dto.reportsToPositionId);
            if (!reportsToPosition) {
                throw new NotFoundException('Reports-to position not found');
            }
            if (!reportsToPosition.isActive) {
                throw new BadRequestException('Cannot report to an inactive position');
            }
            const wouldCreateCycle = await this.wouldCreateCircularReporting(id, dto.reportsToPositionId);
            if (wouldCreateCycle) {
                throw new BadRequestException('This change would create a circular reporting structure');
            }
        }

        if (dto.departmentId) {
            position.departmentId = new Types.ObjectId(dto.departmentId);
        }
        if (dto.reportsToPositionId !== undefined) {
            position.reportsToPositionId = dto.reportsToPositionId ? new Types.ObjectId(dto.reportsToPositionId) : undefined;
        }
        if (dto.code !== undefined) position.code = dto.code;
        if (dto.title !== undefined) position.title = dto.title;
        if (dto.description !== undefined) position.description = dto.description;
        if (dto.isActive !== undefined) position.isActive = dto.isActive;

        const updatedPosition = await position.save();

        await this.logChange({
            action: ChangeLogAction.UPDATED,
            entityType: 'Position',
            entityId: position._id as Types.ObjectId,
            performedByEmployeeId: performedBy,
            summary: `Updated position: ${position.title}`,
            before: beforeSnapshot,
            after: updatedPosition.toObject(),
        });

        const affectedEmployeeIds = await this.sharedOrganizationService.getEmployeesByPosition(id);
        if (affectedEmployeeIds.length > 0) {
            await this.sharedOrganizationService.sendStructureChangeNotification('Position Updated', position.title, affectedEmployeeIds);
        }

        return updatedPosition;
    }

    private async wouldCreateCircularReporting(positionId: string, newReportsToId: string): Promise<boolean> {
        let currentId: string | undefined = newReportsToId;
        const visited = new Set<string>();

        while (currentId) {
            if (currentId === positionId) {
                return true;
            }
            if (visited.has(currentId)) {
                return false;
            }
            visited.add(currentId);

            const position = await this.positionModel.findById(currentId).select('reportsToPositionId').lean();
            currentId = position?.reportsToPositionId?.toString();
        }

        return false;
    }

    async deactivatePosition(id: string, reason?: string, performedBy?: string): Promise<Position> {
        this.validateObjectId(id, 'id');

        const position = await this.positionModel.findById(id);
        if (!position) {
            throw new NotFoundException('Position not found');
        }

        if (!position.isActive) {
            throw new BadRequestException('Position is already inactive');
        }

        const activeAssignments = await this.assignmentModel.countDocuments({
            positionId: id,
            $or: [{ endDate: { $exists: false } }, { endDate: { $gt: new Date() } }],
        });

        if (activeAssignments > 0) {
            throw new BadRequestException(
                `Cannot deactivate position with ${activeAssignments} active assignment(s). End all assignments first or they will be automatically ended.`
            );
        }

        const subordinatePositions = await this.positionModel.countDocuments({
            reportsToPositionId: id,
            isActive: true,
        });

        if (subordinatePositions > 0) {
            throw new BadRequestException(
                `Cannot deactivate position with ${subordinatePositions} subordinate position(s). Update their reporting lines first.`
            );
        }

        const departmentHeadOf = await this.departmentModel.findOne({ headPositionId: id });
        if (departmentHeadOf) {
            throw new BadRequestException(
                `Cannot deactivate position that is the head of department '${departmentHeadOf.name}'. Assign a new head first.`
            );
        }

        const beforeSnapshot = position.toObject();
        position.isActive = false;
        const updatedPosition = await position.save();

        await this.logChange({
            action: ChangeLogAction.DEACTIVATED,
            entityType: 'Position',
            entityId: position._id as Types.ObjectId,
            performedByEmployeeId: performedBy,
            summary: reason || `Deactivated position: ${position.title}`,
            before: beforeSnapshot,
            after: updatedPosition.toObject(),
        });

        await this.sharedOrganizationService.sendStructureChangeNotification('Position Deactivated', position.title);

        return updatedPosition;
    }

    async reactivatePosition(id: string, performedBy?: string): Promise<Position> {
        this.validateObjectId(id, 'id');

        const position = await this.positionModel.findById(id);
        if (!position) {
            throw new NotFoundException('Position not found');
        }

        if (position.isActive) {
            throw new BadRequestException('Position is already active');
        }

        const department = await this.departmentModel.findById(position.departmentId);
        if (!department || !department.isActive) {
            throw new BadRequestException('Cannot reactivate position in an inactive department');
        }

        if (position.reportsToPositionId) {
            const reportsTo = await this.positionModel.findById(position.reportsToPositionId);
            if (!reportsTo || !reportsTo.isActive) {
                throw new BadRequestException('Cannot reactivate position that reports to an inactive position. Update reporting line first.');
            }
        }

        const beforeSnapshot = position.toObject();
        position.isActive = true;
        const updatedPosition = await position.save();

        await this.logChange({
            action: ChangeLogAction.UPDATED,
            entityType: 'Position',
            entityId: position._id as Types.ObjectId,
            performedByEmployeeId: performedBy,
            summary: `Reactivated position: ${position.title}`,
            before: beforeSnapshot,
            after: updatedPosition.toObject(),
        });

        return updatedPosition;
    }

    async searchPositions(queryDto: PositionSearchQuery): Promise<PaginatedResult<Position>> {
        const { page = 1, limit = 20, departmentId, isActive, query } = queryDto;
        const skip = (page - 1) * limit;
        const filter: any = {};

        if (departmentId) {
            this.validateObjectId(departmentId, 'departmentId');
            filter.departmentId = new Types.ObjectId(departmentId);
        }

        if (isActive !== undefined) {
            filter.isActive = isActive;
        }

        if (query && query.trim()) {
            filter.$or = [
                { code: { $regex: query, $options: 'i' } },
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.positionModel.find(filter)
                .populate('departmentId', 'name code')
                .populate('reportsToPositionId', 'title code')
                .sort({ title: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.positionModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data as Position[], total, page, limit);
    }

    async getAllPositions(departmentId?: string, isActive?: boolean): Promise<Position[]> {
        const filter: any = {};
        if (departmentId) {
            this.validateObjectId(departmentId, 'departmentId');
            filter.departmentId = new Types.ObjectId(departmentId);
        }
        if (isActive !== undefined) {
            filter.isActive = isActive;
        }
        return this.positionModel.find(filter)
            .populate('departmentId', 'name code')
            .populate('reportsToPositionId', 'title code')
            .sort({ title: 1 })
            .lean()
            .exec();
    }

    async assignEmployeeToPosition(dto: AssignPositionDto, performedBy?: string): Promise<PositionAssignment> {
        this.validateObjectId(dto.employeeProfileId, 'employeeProfileId');
        this.validateObjectId(dto.positionId, 'positionId');

        const position = await this.positionModel.findById(dto.positionId);
        if (!position) {
            throw new NotFoundException('Position not found');
        }

        if (!position.isActive) {
            throw new BadRequestException('Cannot assign employee to an inactive position');
        }

        if (dto.departmentId) {
            this.validateObjectId(dto.departmentId, 'departmentId');
            if (dto.departmentId !== position.departmentId.toString()) {
                throw new BadRequestException('Department ID must match the position\'s department');
            }
        }

        const existingActiveAssignment = await this.assignmentModel.findOne({
            employeeProfileId: new Types.ObjectId(dto.employeeProfileId),
            $or: [{ endDate: { $exists: false } }, { endDate: { $gt: new Date() } }],
        });

        if (existingActiveAssignment) {
            if (existingActiveAssignment.positionId.toString() === dto.positionId) {
                throw new ConflictException('Employee is already assigned to this position');
            }
            existingActiveAssignment.endDate = new Date(dto.startDate);
            existingActiveAssignment.notes = 'Superseded by new assignment';
            await existingActiveAssignment.save();
        }

        const assignment = await this.assignmentModel.create({
            employeeProfileId: new Types.ObjectId(dto.employeeProfileId),
            positionId: new Types.ObjectId(dto.positionId),
            departmentId: dto.departmentId ? new Types.ObjectId(dto.departmentId) : position.departmentId,
            startDate: new Date(dto.startDate),
            changeRequestId: dto.changeRequestId ? new Types.ObjectId(dto.changeRequestId) : undefined,
            reason: dto.reason,
            notes: dto.notes,
        });

        await this.logChange({
            action: ChangeLogAction.REASSIGNED,
            entityType: 'PositionAssignment',
            entityId: assignment._id as Types.ObjectId,
            performedByEmployeeId: performedBy,
            summary: `Assigned employee to position: ${position.title}`,
            after: assignment.toObject(),
        });

        const departmentId = dto.departmentId || position.departmentId.toString();
        await this.sharedOrganizationService.updateEmployeePrimaryPosition(dto.employeeProfileId, dto.positionId, departmentId);
        await this.sharedOrganizationService.sendStructureChangeNotification('Position Assignment', position.title, [dto.employeeProfileId]);

        return assignment;
    }

    async endAssignment(id: string, dto: EndAssignmentDto, performedBy?: string): Promise<PositionAssignment> {
        this.validateObjectId(id, 'id');

        const assignment = await this.assignmentModel.findById(id);
        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        if (assignment.endDate) {
            throw new BadRequestException('Assignment has already ended');
        }

        const endDate = new Date(dto.endDate);
        if (endDate < assignment.startDate) {
            throw new BadRequestException('End date cannot be before start date');
        }

        const beforeSnapshot = assignment.toObject();
        assignment.endDate = endDate;
        if (dto.reason) assignment.reason = dto.reason;
        if (dto.notes) assignment.notes = dto.notes;
        if (dto.changeRequestId) {
            this.validateObjectId(dto.changeRequestId, 'changeRequestId');
            assignment.changeRequestId = new Types.ObjectId(dto.changeRequestId);
        }

        const updatedAssignment = await assignment.save();

        await this.logChange({
            action: ChangeLogAction.UPDATED,
            entityType: 'PositionAssignment',
            entityId: assignment._id as Types.ObjectId,
            performedByEmployeeId: performedBy,
            summary: 'Ended position assignment',
            before: beforeSnapshot,
            after: updatedAssignment.toObject(),
        });

        await this.sharedOrganizationService.clearEmployeePrimaryPosition(assignment.employeeProfileId.toString());

        return updatedAssignment;
    }

    async getAssignmentById(id: string): Promise<PositionAssignment> {
        this.validateObjectId(id, 'id');
        const assignment = await this.assignmentModel.findById(id)
            .populate('employeeProfileId', 'firstName lastName fullName employeeNumber')
            .populate('positionId', 'title code')
            .populate('departmentId', 'name code');
        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }
        return assignment;
    }

    async searchAssignments(queryDto: AssignmentSearchQuery): Promise<PaginatedResult<PositionAssignment>> {
        const { page = 1, limit = 20, employeeProfileId, positionId, departmentId, activeOnly } = queryDto;
        const skip = (page - 1) * limit;
        const filter: any = {};

        if (employeeProfileId) {
            this.validateObjectId(employeeProfileId, 'employeeProfileId');
            filter.employeeProfileId = new Types.ObjectId(employeeProfileId);
        }

        if (positionId) {
            this.validateObjectId(positionId, 'positionId');
            filter.positionId = new Types.ObjectId(positionId);
        }

        if (departmentId) {
            this.validateObjectId(departmentId, 'departmentId');
            filter.departmentId = new Types.ObjectId(departmentId);
        }

        if (activeOnly) {
            filter.$or = [{ endDate: { $exists: false } }, { endDate: { $gt: new Date() } }];
        }

        const [data, total] = await Promise.all([
            this.assignmentModel.find(filter)
                .populate('employeeProfileId', 'firstName lastName fullName employeeNumber')
                .populate('positionId', 'title code')
                .populate('departmentId', 'name code')
                .sort({ startDate: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.assignmentModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data as PositionAssignment[], total, page, limit);
    }

    async getEmployeeAssignmentHistory(employeeProfileId: string): Promise<PositionAssignment[]> {
        this.validateObjectId(employeeProfileId, 'employeeProfileId');
        return this.assignmentModel.find({ employeeProfileId: new Types.ObjectId(employeeProfileId) })
            .populate('positionId', 'title code')
            .populate('departmentId', 'name code')
            .sort({ startDate: -1 })
            .lean()
            .exec();
    }

    async createChangeRequest(dto: SubmitStructureRequestDto, performedBy?: string): Promise<StructureChangeRequest> {
        if (!dto.requestedByEmployeeId) {
            throw new BadRequestException('Requested by employee ID is required');
        }
        this.validateObjectId(dto.requestedByEmployeeId, 'requestedByEmployeeId');

        if(dto.targetDepartmentId) {
            this.validateObjectId(dto.targetDepartmentId, 'targetDepartmentId');
            const department = await this.departmentModel.findById(dto.targetDepartmentId);
            if (!department) {
                throw new NotFoundException('Target department not found');
            }
        }

        if (dto.targetPositionId) {
            this.validateObjectId(dto.targetPositionId, 'targetPositionId');
            const position = await this.positionModel.findById(dto.targetPositionId);
            if (!position) {
                throw new NotFoundException('Target position not found');
            }
        }

        const existingPendingRequest = await this.changeRequestModel.findOne({
            requestedByEmployeeId: new Types.ObjectId(dto.requestedByEmployeeId),
            status: { $in: [StructureRequestStatus.DRAFT, StructureRequestStatus.SUBMITTED, StructureRequestStatus.UNDER_REVIEW] },
            requestType: dto.requestType,
            targetDepartmentId: dto.targetDepartmentId ? new Types.ObjectId(dto.targetDepartmentId) : undefined,
            targetPositionId: dto.targetPositionId ? new Types.ObjectId(dto.targetPositionId) : undefined,
        });

        if (existingPendingRequest) {
            throw new ConflictException('A similar pending request already exists');
        }

        const request = await this.changeRequestModel.create({
            requestNumber: this.generateRequestNumber(),
            requestedByEmployeeId: new Types.ObjectId(dto.requestedByEmployeeId),
            requestType: dto.requestType,
            targetDepartmentId: dto.targetDepartmentId ? new Types.ObjectId(dto.targetDepartmentId) : undefined,
            targetPositionId: dto.targetPositionId ? new Types.ObjectId(dto.targetPositionId) : undefined,
            details: dto.details,
            reason: dto.reason,
            status: StructureRequestStatus.SUBMITTED,
            submittedByEmployeeId: new Types.ObjectId(dto.requestedByEmployeeId),
            submittedAt: new Date(),
        });

        await this.logChange({
            action: ChangeLogAction.CREATED,
            entityType: 'StructureChangeRequest',
            entityId: request._id,
            performedByEmployeeId: performedBy,
            summary: `Created change request: ${request.requestNumber}`,
            after: request.toObject(),
        });

        const targetName = dto.targetDepartmentId ? 'department' : dto.targetPositionId ? 'position' : 'structure';
        await this.sharedOrganizationService.notifyStructureChangeRequestSubmitted(
            request.requestNumber,
            dto.requestedByEmployeeId,
            dto.requestType,
            targetName
        );

        return request;
    }

    async getChangeRequestById(id: string): Promise<StructureChangeRequest> {
        this.validateObjectId(id, 'id');
        const request = await this.changeRequestModel.findById(id)
            .populate('requestedByEmployeeId', 'firstName lastName fullName employeeNumber')
            .populate('targetDepartmentId', 'name code')
            .populate('targetPositionId', 'title code');
        if (!request) {
            throw new NotFoundException('Change request not found');
        }
        return request;
    }

    async getChangeRequestByNumber(requestNumber: string): Promise<StructureChangeRequest> {
        const request = await this.changeRequestModel.findOne({ requestNumber })
            .populate('requestedByEmployeeId', 'firstName lastName fullName employeeNumber')
            .populate('targetDepartmentId', 'name code')
            .populate('targetPositionId', 'title code');
        if (!request) {
            throw new NotFoundException('Change request not found');
        }
        return request;
    }

    async updateChangeRequest(id: string, dto: UpdateStructureRequestDto, performedBy?: string): Promise<StructureChangeRequest> {
        this.validateObjectId(id, 'id');

        const request = await this.changeRequestModel.findById(id);
        if (!request) {
            throw new NotFoundException('Change request not found');
        }

        if (![StructureRequestStatus.DRAFT, StructureRequestStatus.SUBMITTED].includes(request.status)) {
            throw new BadRequestException(`Cannot update request with status ${request.status}`);
        }

        const beforeSnapshot = request.toObject();

        if (dto.targetDepartmentId) {
            this.validateObjectId(dto.targetDepartmentId, 'targetDepartmentId');
            request.targetDepartmentId = new Types.ObjectId(dto.targetDepartmentId);
        }

        if (dto.targetPositionId) {
            this.validateObjectId(dto.targetPositionId, 'targetPositionId');
            request.targetPositionId = new Types.ObjectId(dto.targetPositionId);
        }

        if (dto.details !== undefined) request.details = dto.details;
        if (dto.reason !== undefined) request.reason = dto.reason;
        if (dto.status !== undefined) request.status = dto.status;

        const updatedRequest = await request.save();

        await this.logChange({
            action: ChangeLogAction.UPDATED,
            entityType: 'StructureChangeRequest',
            entityId: request._id,
            performedByEmployeeId: performedBy,
            summary: `Updated change request: ${request.requestNumber}`,
            before: beforeSnapshot,
            after: updatedRequest.toObject(),
        });

        return updatedRequest;
    }

    async cancelChangeRequest(id: string, performedBy?: string): Promise<StructureChangeRequest> {
        this.validateObjectId(id, 'id');

        const request = await this.changeRequestModel.findById(id);
        if (!request) {
            throw new NotFoundException('Change request not found');
        }

        if (![StructureRequestStatus.DRAFT, StructureRequestStatus.SUBMITTED, StructureRequestStatus.UNDER_REVIEW].includes(request.status)) {
            throw new BadRequestException(`Cannot cancel request with status ${request.status}`);
        }

        const beforeSnapshot = request.toObject();
        request.status = StructureRequestStatus.CANCELED;
        const updatedRequest = await request.save();

        await this.logChange({
            action: ChangeLogAction.UPDATED,
            entityType: 'StructureChangeRequest',
            entityId: request._id,
            performedByEmployeeId: performedBy,
            summary: `Canceled change request: ${request.requestNumber}`,
            before: beforeSnapshot,
            after: updatedRequest.toObject(),
        });

        return updatedRequest;
    }

    async searchChangeRequests(queryDto: ChangeRequestSearchQuery): Promise<PaginatedResult<StructureChangeRequest>> {
        const { page = 1, limit = 20, status, requestType, requestedByEmployeeId } = queryDto;
        const skip = (page - 1) * limit;
        const filter: any = {};

        if (status) {
            filter.status = status;
        }

        if (requestType) {
            filter.requestType = requestType;
        }

        if (requestedByEmployeeId) {
            this.validateObjectId(requestedByEmployeeId, 'requestedByEmployeeId');
            filter.requestedByEmployeeId = new Types.ObjectId(requestedByEmployeeId);
        }

        const [data, total] = await Promise.all([
            this.changeRequestModel.find(filter)
                .populate('requestedByEmployeeId', 'firstName lastName fullName employeeNumber')
                .populate('targetDepartmentId', 'name code')
                .populate('targetPositionId', 'title code')
                .sort({ submittedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.changeRequestModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data as StructureChangeRequest[], total, page, limit);
    }

    async submitApprovalDecision(changeRequestId: string, dto: SubmitApprovalDecisionDto, performedBy?: string): Promise<StructureApproval> {
        this.validateObjectId(changeRequestId, 'changeRequestId');

        if (!dto.approverEmployeeId) {
            throw new BadRequestException('Approver employee ID is required');
        }
        this.validateObjectId(dto.approverEmployeeId, 'approverEmployeeId');

        const changeRequest = await this.changeRequestModel.findById(changeRequestId);
        if (!changeRequest) {
            throw new NotFoundException('Change request not found');
        }

        console.log(`[SubmitApprovalDecision] Request ID: ${changeRequestId}, Current status: ${changeRequest.status}, Decision: ${dto.decision}`);

        // Check if status is actionable (case-insensitive, including 'pending')
        const normalizedStatus = changeRequest.status?.toUpperCase();
        const actionableStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'];
        if (!actionableStatuses.includes(normalizedStatus)) {
            throw new BadRequestException(`Cannot approve/reject request with status ${changeRequest.status}`);
        }

        const existingDecision = await this.approvalModel.findOne({
            changeRequestId: new Types.ObjectId(changeRequestId),
            approverEmployeeId: new Types.ObjectId(dto.approverEmployeeId),
            decision: { $ne: ApprovalDecision.PENDING },
        });

        if (existingDecision) {
            throw new ConflictException('This approver has already submitted a decision');
        }

        if (dto.decision === ApprovalDecision.REJECTED && !dto.comments) {
            throw new BadRequestException('Comments are required when rejecting a request');
        }

        const approval = await this.approvalModel.create({
            changeRequestId: new Types.ObjectId(changeRequestId),
            approverEmployeeId: new Types.ObjectId(dto.approverEmployeeId),
            decision: dto.decision,
            decidedAt: new Date(),
            comments: dto.comments,
        });

        // Determine new status
        let newStatus: StructureRequestStatus;
        if (dto.decision === ApprovalDecision.APPROVED) {
            newStatus = StructureRequestStatus.APPROVED;
        } else if (dto.decision === ApprovalDecision.REJECTED) {
            newStatus = StructureRequestStatus.REJECTED;
        } else {
            newStatus = changeRequest.status;
        }

        console.log(`[SubmitApprovalDecision] Updating status from ${changeRequest.status} to ${newStatus}`);

        // Use findByIdAndUpdate to ensure the update is persisted
        const updatedRequest = await this.changeRequestModel.findByIdAndUpdate(
            changeRequestId,
            { $set: { status: newStatus } },
            { new: true }
        );

        console.log(`[SubmitApprovalDecision] Updated request status: ${updatedRequest?.status}`);

        await this.logChange({
            action: ChangeLogAction.UPDATED,
            entityType: 'StructureApproval',
            entityId: approval._id,
            performedByEmployeeId: performedBy,
            summary: `${dto.decision} change request: ${changeRequest.requestNumber}`,
            after: approval.toObject(),
        });

        try {
            await this.sharedOrganizationService.notifyStructureChangeRequestProcessed(
                changeRequest.requestedByEmployeeId.toString(),
                changeRequest.requestNumber,
                dto.decision,
                dto.comments
            );
        } catch (notifyError) {
            console.error('[SubmitApprovalDecision] Notification error:', notifyError);
            // Don't throw - notification failure shouldn't fail the approval
        }

        return approval;
    }

    async getApprovalsByChangeRequest(changeRequestId: string): Promise<StructureApproval[]> {
        this.validateObjectId(changeRequestId, 'changeRequestId');
        return this.approvalModel.find({ changeRequestId: new Types.ObjectId(changeRequestId) })
            .populate('approverEmployeeId', 'firstName lastName fullName employeeNumber')
            .sort({ decidedAt: -1 })
            .lean()
            .exec();
    }

    async getDepartmentHierarchy(departmentId: string): Promise<{ department: Department; positions: Position[]; assignments: PositionAssignment[] }> {
        this.validateObjectId(departmentId, 'departmentId');

        const department = await this.departmentModel.findById(departmentId).populate('headPositionId');
        if (!department) {
            throw new NotFoundException('Department not found');
        }

        const positions = await this.positionModel.find({ departmentId: new Types.ObjectId(departmentId) })
            .populate('reportsToPositionId', 'title code')
            .sort({ title: 1 })
            .lean()
            .exec();

        const assignments = await this.assignmentModel.find({
            departmentId: new Types.ObjectId(departmentId),
            $or: [{ endDate: { $exists: false } }, { endDate: { $gt: new Date() } }],
        })
            .populate('employeeProfileId', 'firstName lastName fullName employeeNumber')
            .populate('positionId', 'title code')
            .lean()
            .exec();

        return { department, positions: positions as Position[], assignments: assignments as PositionAssignment[] };
    }

    async getOrganizationChart(): Promise<{ departments: Department[]; positions: Position[] }> {
        const departments = await this.departmentModel.find({ isActive: true })
            .populate('headPositionId', 'title code')
            .sort({ name: 1 })
            .lean()
            .exec();

        const positions = await this.positionModel.find({ isActive: true })
            .populate('departmentId', 'name code')
            .populate('reportsToPositionId', 'title code')
            .sort({ title: 1 })
            .lean()
            .exec();

        return { departments: departments as Department[], positions: positions as Position[] };
    }

    async getPositionSubordinates(positionId: string): Promise<Position[]> {
        this.validateObjectId(positionId, 'positionId');
        return this.positionModel.find({ reportsToPositionId: new Types.ObjectId(positionId), isActive: true })
            .populate('departmentId', 'name code')
            .sort({ title: 1 })
            .lean()
            .exec();
    }

    async getChangeLogsByEntity(entityType: string, entityId: string, page: number = 1, limit: number = 20): Promise<PaginatedResult<StructureChangeLog>> {
        this.validateObjectId(entityId, 'entityId');
        const skip = (page - 1) * limit;
        const filter = { entityType, entityId: new Types.ObjectId(entityId) };

        const [data, total] = await Promise.all([
            this.changeLogModel.find(filter)
                .populate('performedByEmployeeId', 'firstName lastName fullName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.changeLogModel.countDocuments(filter).exec(),
        ]);

        return this.createPaginatedResponse(data as StructureChangeLog[], total, page, limit);
    }

    async getDepartmentStats(): Promise<{ total: number; active: number; inactive: number }> {
        const [total, active] = await Promise.all([
            this.departmentModel.countDocuments(),
            this.departmentModel.countDocuments({ isActive: true }),
        ]);
        return { total, active, inactive: total - active };
    }

    async getPositionStats(): Promise<{ total: number; active: number; inactive: number; vacant: number; filled: number }> {
        const [total, active] = await Promise.all([
            this.positionModel.countDocuments(),
            this.positionModel.countDocuments({ isActive: true }),
        ]);

        const filledPositionIds = await this.assignmentModel.distinct('positionId', {
            $or: [{ endDate: { $exists: false } }, { endDate: { $gt: new Date() } }],
        });

        const filled = filledPositionIds.length;
        const vacant = active - filled;

        return { total, active, inactive: total - active, vacant: Math.max(0, vacant), filled };
    }

    async getPendingRequestsCount(): Promise<number> {
        return this.changeRequestModel.countDocuments({
            status: { $in: [StructureRequestStatus.SUBMITTED, StructureRequestStatus.UNDER_REVIEW] },
        });
    }
}
