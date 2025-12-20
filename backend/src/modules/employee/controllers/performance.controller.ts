// COMMENTED OUT FOR TESTING - Using performance-no-auth.controller.ts instead
// Uncomment this controller and remove the no-auth version for production


import { Controller, Get, Post, Patch, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { PerformanceService, TemplateSearchQuery, CycleSearchQuery, AssignmentSearchQuery, RecordSearchQuery, DisputeSearchQuery } from '../services/performance.service';
import { CreateAppraisalTemplateDto, UpdateAppraisalTemplateDto } from '../dto/performance/appraisal-template.dto';
import { CreateAppraisalCycleDto, UpdateAppraisalCycleDto } from '../dto/performance/appraisal-cycle.dto';
import { BulkCreateAppraisalAssignmentDto, CreateAppraisalAssignmentDto } from '../dto/performance/appraisal-assignment.dto';
import { SubmitAppraisalRecordDto } from '../dto/performance/appraisal-record.dto';
import { FileAppraisalDisputeDto, ResolveAppraisalDisputeDto } from '../dto/performance/appraisal-dispute.dto';
import { AppraisalTemplateType, AppraisalCycleStatus, AppraisalAssignmentStatus, AppraisalRecordStatus, AppraisalDisputeStatus } from '../enums/performance.enums';
import { SystemRole } from '../enums/employee-profile.enums';
import { AuthenticationGuard } from '../../auth/guards/authentication-guard';
import { AuthorizationGuard } from '../../auth/guards/authorization-guard';
import { Roles } from '../../auth/decorators/roles-decorator';
import { CurrentUser } from '../../auth/decorators/current-user';
import type { JwtPayload } from '../../auth/token/jwt-payload';

@Controller('performance')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class PerformanceController {
    constructor(private performanceService: PerformanceService) {}

    // ==================== TEMPLATES ====================

    @Post('templates')
    @HttpCode(HttpStatus.CREATED)
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async createTemplate(@Body() dto: CreateAppraisalTemplateDto) {
        return this.performanceService.createTemplate(dto);
    }

    @Get('templates')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    async getAllTemplates(@Query('isActive') isActive?: string) {
        const active = isActive === undefined ? undefined : isActive === 'true';
        return this.performanceService.getAllTemplates(active);
    }

    @Get('templates/search')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    async searchTemplates(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('query') query?: string,
        @Query('templateType') templateType?: AppraisalTemplateType,
        @Query('isActive') isActive?: string,
    ) {
        const queryDto: TemplateSearchQuery = {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            query,
            templateType,
            isActive: isActive === undefined ? undefined : isActive === 'true',
        };
        return this.performanceService.searchTemplates(queryDto);
    }

    @Get('templates/stats')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getTemplateStats() {
        return this.performanceService.getTemplateStats();
    }

    @Get('templates/:id')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    async getTemplateById(@Param('id') id: string) {
        return this.performanceService.getTemplateById(id);
    }

    @Patch('templates/:id')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async updateTemplate(@Param('id') id: string, @Body() dto: UpdateAppraisalTemplateDto) {
        return this.performanceService.updateTemplate(id, dto);
    }

    @Patch('templates/:id/deactivate')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async deactivateTemplate(@Param('id') id: string) {
        return this.performanceService.deactivateTemplate(id);
    }

    @Patch('templates/:id/reactivate')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async reactivateTemplate(@Param('id') id: string) {
        return this.performanceService.reactivateTemplate(id);
    }

    // ==================== CYCLES ====================

    @Post('cycles')
    @HttpCode(HttpStatus.CREATED)
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async createCycle(@Body() dto: CreateAppraisalCycleDto) {
        return this.performanceService.createCycle(dto);
    }

    @Get('cycles')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    async getAllCycles(@Query('status') status?: AppraisalCycleStatus) {
        return this.performanceService.getAllCycles(status);
    }

    @Get('cycles/search')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    async searchCycles(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('query') query?: string,
        @Query('status') status?: AppraisalCycleStatus,
        @Query('cycleType') cycleType?: AppraisalTemplateType,
    ) {
        const queryDto: CycleSearchQuery = {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            query,
            status,
            cycleType,
        };
        return this.performanceService.searchCycles(queryDto);
    }

    @Get('cycles/stats')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getCycleStats() {
        return this.performanceService.getCycleStats();
    }

    @Get('cycles/:id')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    async getCycleById(@Param('id') id: string) {
        return this.performanceService.getCycleById(id);
    }

    @Patch('cycles/:id')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async updateCycle(@Param('id') id: string, @Body() dto: UpdateAppraisalCycleDto) {
        return this.performanceService.updateCycle(id, dto);
    }

    @Post('cycles/:id/activate')
    @HttpCode(HttpStatus.OK)
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async activateCycle(@Param('id') id: string) {
        return this.performanceService.activateCycle(id);
    }

    @Post('cycles/:id/close')
    @HttpCode(HttpStatus.OK)
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async closeCycle(@Param('id') id: string) {
        return this.performanceService.closeCycle(id);
    }

    @Post('cycles/:id/archive')
    @HttpCode(HttpStatus.OK)
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async archiveCycle(@Param('id') id: string) {
        return this.performanceService.archiveCycle(id);
    }

    // ==================== ASSIGNMENTS ====================

    @Post('assignments')
    @HttpCode(HttpStatus.CREATED)
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async createAssignment(@Body() dto: CreateAppraisalAssignmentDto) {
        return this.performanceService.createAssignment(dto);
    }

    @Post('assignments/bulk')
    @HttpCode(HttpStatus.CREATED)
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async bulkCreateAssignments(@Body() dto: BulkCreateAppraisalAssignmentDto) {
        return this.performanceService.bulkCreateAssignments(dto);
    }

    @Get('assignments')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    async searchAssignments(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('cycleId') cycleId?: string,
        @Query('employeeProfileId') employeeProfileId?: string,
        @Query('managerProfileId') managerProfileId?: string,
        @Query('departmentId') departmentId?: string,
        @Query('status') status?: AppraisalAssignmentStatus,
    ) {
        const queryDto: AssignmentSearchQuery = {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            cycleId,
            employeeProfileId,
            managerProfileId,
            departmentId,
            status,
        };
        return this.performanceService.searchAssignments(queryDto);
    }

    @Get('assignments/manager/:managerProfileId')
    @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getAssignmentsForManager(@Param('managerProfileId') managerProfileId: string) {
        return this.performanceService.getAssignmentsForManager(managerProfileId);
    }

    @Get('assignments/employee/:employeeProfileId')
    async getAssignmentsForEmployee(@Param('employeeProfileId') employeeProfileId: string) {
        return this.performanceService.getAssignmentsForEmployee(employeeProfileId);
    }

    @Get('assignments/:id')
    async getAssignmentById(@Param('id') id: string) {
        return this.performanceService.getAssignmentById(id);
    }

    // ==================== RECORDS ====================

    @Post('records')
    @HttpCode(HttpStatus.CREATED)
    @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async submitAppraisalRecord(@Body() dto: SubmitAppraisalRecordDto) {
        return this.performanceService.submitAppraisalRecord(dto);
    }

    @Post('records/draft')
    @HttpCode(HttpStatus.CREATED)
    @Roles(SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async saveDraftRecord(@Body() dto: SubmitAppraisalRecordDto) {
        return this.performanceService.saveDraftRecord(dto);
    }

    @Get('records')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    async searchRecords(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('cycleId') cycleId?: string,
        @Query('employeeProfileId') employeeProfileId?: string,
        @Query('managerProfileId') managerProfileId?: string,
        @Query('status') status?: AppraisalRecordStatus,
    ) {
        const queryDto: RecordSearchQuery = {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            cycleId,
            employeeProfileId,
            managerProfileId,
            status,
        };
        return this.performanceService.searchRecords(queryDto);
    }

    @Get('records/assignment/:assignmentId')
    async getRecordByAssignment(@Param('assignmentId') assignmentId: string) {
        return this.performanceService.getRecordByAssignment(assignmentId);
    }

    @Get('records/:id')
    async getRecordById(@Param('id') id: string) {
        return this.performanceService.getRecordById(id);
    }

    @Post('records/:id/publish')
    @HttpCode(HttpStatus.OK)
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async publishRecord(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
        return this.performanceService.publishRecord(id, user.sub);
    }

    @Post('records/bulk-publish')
    @HttpCode(HttpStatus.OK)
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async bulkPublishRecords(@Body() body: { recordIds: string[] }, @CurrentUser() user: JwtPayload) {
        return this.performanceService.bulkPublishRecords(body.recordIds, user.sub);
    }

    @Post('records/:id/acknowledge')
    @HttpCode(HttpStatus.OK)
    async acknowledgeRecord(@Param('id') id: string, @Body() body?: { comment?: string }) {
        return this.performanceService.acknowledgeRecord(id, body?.comment);
    }

    @Post('records/:id/view')
    @HttpCode(HttpStatus.OK)
    async markRecordViewed(@Param('id') id: string) {
        return this.performanceService.markRecordViewed(id);
    }

    // ==================== EMPLOYEE SELF-SERVICE (me routes) ====================
    // These routes use JWT token to get the employee ID

    @Get('employee/me/history')
    async getMyAppraisalHistory(@CurrentUser() user: JwtPayload) {
        return this.performanceService.getEmployeeAppraisalHistory(user.sub);
    }

    @Get('employee/me/current')
    async getMyCurrentAppraisal(@CurrentUser() user: JwtPayload) {
        return this.performanceService.getEmployeeCurrentAppraisal(user.sub);
    }

    @Get('employee/me/goals')
    async getMyGoals(@CurrentUser() user: JwtPayload) {
        return this.performanceService.getEmployeeGoals(user.sub);
    }

    // Admin route - must come AFTER /me routes
    @Get('employee/:employeeProfileId/history')
    async getEmployeeAppraisalHistory(@Param('employeeProfileId') employeeProfileId: string) {
        return this.performanceService.getEmployeeAppraisalHistory(employeeProfileId);
    }

    // ==================== DISPUTES ====================

    @Post('disputes')
    @HttpCode(HttpStatus.CREATED)
    async fileDispute(@Body() dto: FileAppraisalDisputeDto) {
        return this.performanceService.fileDispute(dto);
    }

    @Get('disputes')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async searchDisputes(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('cycleId') cycleId?: string,
        @Query('status') status?: AppraisalDisputeStatus,
        @Query('raisedByEmployeeId') raisedByEmployeeId?: string,
    ) {
        const queryDto: DisputeSearchQuery = {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            cycleId,
            status,
            raisedByEmployeeId,
        };
        return this.performanceService.searchDisputes(queryDto);
    }

    @Get('disputes/stats')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async getDisputeStats(@Query('cycleId') cycleId?: string) {
        return this.performanceService.getDisputeStats(cycleId);
    }

    @Get('disputes/:id')
    async getDisputeById(@Param('id') id: string) {
        return this.performanceService.getDisputeById(id);
    }

    @Patch('disputes/:id/assign-reviewer')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async assignDisputeReviewer(@Param('id') id: string, @Body() body: { reviewerEmployeeId: string }) {
        return this.performanceService.assignDisputeReviewer(id, body.reviewerEmployeeId);
    }

    @Patch('disputes/:id/resolve')
    @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    async resolveDispute(@Param('id') id: string, @Body() dto: ResolveAppraisalDisputeDto, @CurrentUser() user: JwtPayload) {
        return this.performanceService.resolveDispute({ ...dto, disputeId: id, resolvedByEmployeeId: user.sub });
    }

    // ==================== DASHBOARD ====================

    @Get('dashboard/:cycleId')
    @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    async getCompletionDashboard(@Param('cycleId') cycleId: string) {
        return this.performanceService.getCompletionDashboard(cycleId);
    }
}



