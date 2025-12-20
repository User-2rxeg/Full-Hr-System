// COMMENTED OUT FOR TESTING - Using organization-structure-no-auth.controller.ts instead
// Uncomment this controller and remove the no-auth version for production


import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrganizationStructureService, DepartmentSearchQuery, PositionSearchQuery, AssignmentSearchQuery, ChangeRequestSearchQuery } from '../services/organization-structure.service';
import { CreateDepartmentDto, UpdateDepartmentDto, CreatePositionDto, UpdatePositionDto, AssignPositionDto, EndAssignmentDto, SubmitStructureRequestDto, UpdateStructureRequestDto, SubmitApprovalDecisionDto } from '../dto/organization-structure';
import { StructureRequestStatus, StructureRequestType } from '../enums/organization-structure.enums';
import { SystemRole } from '../enums/employee-profile.enums';
import { AuthenticationGuard } from '../../auth/guards/authentication-guard';
import { AuthorizationGuard } from '../../auth/guards/authorization-guard';
import { Roles } from '../../auth/decorators/roles-decorator';
import { CurrentUser } from '../../auth/decorators/current-user';
import type { JwtPayload } from '../../auth/token/jwt-payload';

@Controller('organization-structure')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class OrganizationStructureController {
    constructor(private readonly orgService: OrganizationStructureService) {}

    @Post('departments')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    createDepartment(@Body() dto: CreateDepartmentDto) {
        return this.orgService.createDepartment(dto);
    }

    @Get('departments')
    getAllDepartments(@Query('isActive') isActive?: string) {
        const active = isActive === undefined ? undefined : isActive === 'true';
        return this.orgService.getAllDepartments(active);
    }

    @Get('departments/search')
    searchDepartments(
        @Query('query') query?: string,
        @Query('isActive') isActive?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        const queryDto: DepartmentSearchQuery = {
            query,
            isActive: isActive === undefined ? undefined : isActive === 'true',
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        };
        return this.orgService.searchDepartments(queryDto);
    }

    @Get('departments/stats')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    getDepartmentStats() {
        return this.orgService.getDepartmentStats();
    }

    @Get('departments/:id')
    getDepartmentById(@Param('id') id: string) {
        return this.orgService.getDepartmentById(id);
    }

    @Get('departments/:id/hierarchy')
    getDepartmentHierarchy(@Param('id') id: string) {
        return this.orgService.getDepartmentHierarchy(id);
    }

    @Patch('departments/:id')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
        return this.orgService.updateDepartment(id, dto);
    }

    @Patch('departments/:id/deactivate')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    deactivateDepartment(@Param('id') id: string) {
        return this.orgService.deactivateDepartment(id);
    }

    @Patch('departments/:id/reactivate')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    reactivateDepartment(@Param('id') id: string) {
        return this.orgService.reactivateDepartment(id);
    }

    @Post('positions')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    createPosition(@Body() dto: CreatePositionDto) {
        return this.orgService.createPosition(dto);
    }

    @Get('positions')
    getAllPositions(@Query('departmentId') departmentId?: string, @Query('isActive') isActive?: string) {
        const active = isActive === undefined ? undefined : isActive === 'true';
        return this.orgService.getAllPositions(departmentId, active);
    }

    @Get('positions/search')
    searchPositions(
        @Query('query') query?: string,
        @Query('departmentId') departmentId?: string,
        @Query('isActive') isActive?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        const queryDto: PositionSearchQuery = {
            query,
            departmentId,
            isActive: isActive === undefined ? undefined : isActive === 'true',
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        };
        return this.orgService.searchPositions(queryDto);
    }

    @Get('positions/stats')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    getPositionStats() {
        return this.orgService.getPositionStats();
    }

    @Get('positions/:id')
    getPositionById(@Param('id') id: string) {
        return this.orgService.getPositionById(id);
    }

    @Get('positions/:id/subordinates')
    getPositionSubordinates(@Param('id') id: string) {
        return this.orgService.getPositionSubordinates(id);
    }

    @Patch('positions/:id')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    updatePosition(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
        return this.orgService.updatePosition(id, dto);
    }

    @Patch('positions/:id/deactivate')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    deactivatePosition(@Param('id') id: string, @Body('reason') reason?: string) {
        return this.orgService.deactivatePosition(id, reason);
    }

    @Patch('positions/:id/reactivate')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    reactivatePosition(@Param('id') id: string) {
        return this.orgService.reactivatePosition(id);
    }

    @Post('assignments')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    assignEmployeeToPosition(@Body() dto: AssignPositionDto) {
        return this.orgService.assignEmployeeToPosition(dto);
    }

    @Get('assignments')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    searchAssignments(
        @Query('employeeProfileId') employeeProfileId?: string,
        @Query('positionId') positionId?: string,
        @Query('departmentId') departmentId?: string,
        @Query('activeOnly') activeOnly?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        const queryDto: AssignmentSearchQuery = {
            employeeProfileId,
            positionId,
            departmentId,
            activeOnly: activeOnly === 'true',
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        };
        return this.orgService.searchAssignments(queryDto);
    }

    @Get('assignments/employee/:employeeProfileId/history')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    getEmployeeAssignmentHistory(@Param('employeeProfileId') employeeProfileId: string) {
        return this.orgService.getEmployeeAssignmentHistory(employeeProfileId);
    }

    @Get('assignments/:id')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    getAssignmentById(@Param('id') id: string) {
        return this.orgService.getAssignmentById(id);
    }

    @Patch('assignments/:id/end')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    endAssignment(@Param('id') id: string, @Body() dto: EndAssignmentDto) {
        return this.orgService.endAssignment(id, dto);
    }

    @Post('change-requests')
    @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    createChangeRequest(@Body() dto: SubmitStructureRequestDto, @CurrentUser() user: JwtPayload) {
        return this.orgService.createChangeRequest({ ...dto, requestedByEmployeeId: user.sub });
    }

    @Get('change-requests')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    searchChangeRequests(
        @Query('status') status?: StructureRequestStatus,
        @Query('requestType') requestType?: StructureRequestType,
        @Query('requestedByEmployeeId') requestedByEmployeeId?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        const queryDto: ChangeRequestSearchQuery = {
            status,
            requestType,
            requestedByEmployeeId,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        };
        return this.orgService.searchChangeRequests(queryDto);
    }

    @Get('change-requests/count/pending')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    getPendingRequestsCount() {
        return this.orgService.getPendingRequestsCount().then(count => ({ count }));
    }

    @Get('change-requests/by-number/:requestNumber')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    getChangeRequestByNumber(@Param('requestNumber') requestNumber: string) {
        return this.orgService.getChangeRequestByNumber(requestNumber);
    }

    @Get('change-requests/:id')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    getChangeRequestById(@Param('id') id: string) {
        return this.orgService.getChangeRequestById(id);
    }

    @Get('change-requests/:id/approvals')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    getApprovalsByChangeRequest(@Param('id') id: string) {
        return this.orgService.getApprovalsByChangeRequest(id);
    }

    @Patch('change-requests/:id')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    updateChangeRequest(@Param('id') id: string, @Body() dto: UpdateStructureRequestDto) {
        return this.orgService.updateChangeRequest(id, dto);
    }

    @Patch('change-requests/:id/cancel')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    cancelChangeRequest(@Param('id') id: string) {
        return this.orgService.cancelChangeRequest(id);
    }

    @Post('change-requests/:id/approvals')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    submitApprovalDecision(@Param('id') id: string, @Body() dto: SubmitApprovalDecisionDto, @CurrentUser() user: JwtPayload) {
        return this.orgService.submitApprovalDecision(id, { ...dto, approverEmployeeId: user.sub }, user.sub);
    }

    @Get('org-chart')
    getOrganizationChart() {
        return this.orgService.getOrganizationChart();
    }

    @Get('change-logs/:entityType/:entityId')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    getChangeLogsByEntity(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        return this.orgService.getChangeLogsByEntity(
            entityType,
            entityId,
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 20
        );
    }
}

