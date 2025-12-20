import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { OffboardingService } from '../services/offboarding.service';
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
import { TerminationStatus } from '../enums/termination-status.enum';
import { TerminationInitiation } from '../enums/termination-initiation.enum';
import { AuthenticationGuard } from '../../auth/guards/authentication-guard';
import { AuthorizationGuard } from '../../auth/guards/authorization-guard';
import { Roles } from '../../auth/decorators/roles-decorator';
import { SystemRole } from '../../employee/enums/employee-profile.enums';

@ApiTags('Offboarding')
@ApiBearerAuth('access-token')
@Controller('offboarding')
//@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class OffboardingController {
    constructor(private readonly offboardingService: OffboardingService) {}

    // ============================================================
    // Requirement: Termination & Resignation Initiation
    // OFF-001: HR Manager initiates termination reviews
    // ============================================================

    @Get('termination-reviews/employee/:employeeId/performance')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({
        summary: 'OFF-001: Get employee performance for termination review',
        description: 'HR Manager reviews employee performance data (warnings, low scores) from Performance Management before initiating termination. BR 4: Termination reviews based on performance must follow due process.',
    })
    @ApiParam({ name: 'employeeId', description: 'Employee ID to review' })
    @ApiResponse({ status: 200, description: 'Employee performance summary with termination justification' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    async getEmployeePerformanceForTermination(@Param('employeeId') employeeId: string) {
        return this.offboardingService.getEmployeePerformanceForTermination(employeeId);
    }

    @Post('termination-requests')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({
        summary: 'OFF-001: Create termination request',
        description: 'HR Manager initiates termination reviews based on warnings and performance data / manager requests. BR 4: employee separation needs an effective date and a clearly stated reason for exit.',
    })
    @ApiBody({ type: CreateTerminationRequestDto })
    @ApiResponse({ status: 201, description: 'Termination request created successfully' })
    @ApiResponse({ status: 404, description: 'Contract not found' })
    @ApiResponse({ status: 409, description: 'Active termination request already exists' })
    async createTerminationRequest(@Body() dto: CreateTerminationRequestDto) {
        return this.offboardingService.createTerminationRequest(dto);
    }

    @Get('termination-requests')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'Get all termination requests',
        description: 'Retrieve all termination requests with optional filtering by employee, status, and initiator',
    })
    @ApiQuery({ name: 'employeeId', required: false, description: 'Filter by employee ID' })
    @ApiQuery({ name: 'status', required: false, enum: TerminationStatus, description: 'Filter by status' })
    @ApiQuery({ name: 'initiator', required: false, enum: TerminationInitiation, description: 'Filter by initiator (employee, hr, manager)' })
    @ApiResponse({ status: 200, description: 'List of termination requests' })
    async getAllTerminationRequests(
        @Query('employeeId') employeeId?: string,
        @Query('status') status?: TerminationStatus,
        @Query('initiator') initiator?: TerminationInitiation,
    ) {
        return this.offboardingService.getAllTerminationRequests(employeeId, status, initiator);
    }

    @Get('termination-requests/by-initiator/:initiator')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'Get termination requests by initiator',
        description: 'Get all termination/resignation requests filtered by initiator (employee=resignations, hr/manager=terminations)',
    })
    @ApiParam({ name: 'initiator', enum: TerminationInitiation, description: 'Initiator type: employee, hr, or manager' })
    @ApiQuery({ name: 'status', required: false, enum: TerminationStatus, description: 'Optional status filter' })
    @ApiResponse({ status: 200, description: 'List of termination requests by initiator' })
    async getTerminationRequestsByInitiator(
        @Param('initiator') initiator: TerminationInitiation,
        @Query('status') status?: TerminationStatus,
    ) {
        return this.offboardingService.getTerminationRequestsByInitiator(initiator, status);
    }

    @Get('resignation-requests/all')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'Get all resignation requests',
        description: 'Get all employee-initiated resignation requests (convenience endpoint)',
    })
    @ApiQuery({ name: 'status', required: false, enum: TerminationStatus, description: 'Optional status filter' })
    @ApiResponse({ status: 200, description: 'List of all resignation requests' })
    async getAllResignationRequests(@Query('status') status?: TerminationStatus) {
        return this.offboardingService.getAllResignationRequests(status);
    }

    @Get('termination-requests/by-status/:status')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'Get termination requests by status',
        description: 'Get all termination/resignation requests with a specific status across all initiators',
    })
    @ApiParam({ name: 'status', enum: TerminationStatus, description: 'Status: pending, under_review, approved, or rejected' })
    @ApiResponse({ status: 200, description: 'List of termination requests with specified status' })
    async getTerminationRequestsByStatus(@Param('status') status: TerminationStatus) {
        return this.offboardingService.getTerminationRequestsByStatus(status);
    }

    @Get('termination-requests/:id')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_EMPLOYEE)
    @ApiOperation({
        summary: 'Get termination request by ID',
        description: 'Retrieve a specific termination request with full details',
    })
    @ApiParam({ name: 'id', description: 'Termination request ID' })
    @ApiResponse({ status: 200, description: 'Termination request details' })
    @ApiResponse({ status: 404, description: 'Termination request not found' })
    async getTerminationRequestById(@Param('id') id: string) {
        return this.offboardingService.getTerminationRequestById(id);
    }

    @Patch('termination-requests/:id/status')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.FINANCE_STAFF)
    @ApiOperation({
        summary: 'Update termination request status',
        description: 'Update the status of a termination request (workflow approval process)',
    })
    @ApiParam({ name: 'id', description: 'Termination request ID' })
    @ApiBody({ type: UpdateTerminationStatusDto })
    @ApiResponse({ status: 200, description: 'Termination request status updated' })
    @ApiResponse({ status: 404, description: 'Termination request not found' })
    @ApiResponse({ status: 400, description: 'Invalid status transition' })
    async updateTerminationStatus(
        @Param('id') id: string,
        @Body() dto: UpdateTerminationStatusDto,
    ) {
        return this.offboardingService.updateTerminationStatus(id, dto);
    }

    @Delete('termination-requests/:id')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'Delete termination request',
        description: 'Delete a termination request (only if not approved/rejected)',
    })
    @ApiParam({ name: 'id', description: 'Termination request ID' })
    @ApiResponse({ status: 200, description: 'Termination request deleted successfully' })
    @ApiResponse({ status: 404, description: 'Termination request not found' })
    @ApiResponse({ status: 400, description: 'Cannot delete approved termination request' })
    async deleteTerminationRequest(@Param('id') id: string) {
        return this.offboardingService.deleteTerminationRequest(id);
    }

    // ============================================================
    // Requirement: Termination & Resignation Initiation
    // OFF-018, OFF-019: employee resignation requests
    // ============================================================

    @Post('resignation-requests')
    //@Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'OFF-018: Create resignation request',
        description: 'employee submits resignation request with reasoning. BR 6: employee separation can be triggered by resignation with identified approval workflow (employee > Line Manager > Financial approval > HR processing/approval).',
    })
    @ApiBody({ type: CreateResignationRequestDto })
    @ApiResponse({ status: 201, description: 'Resignation request created successfully' })
    @ApiResponse({ status: 404, description: 'Contract not found' })
    @ApiResponse({ status: 409, description: 'Active resignation/termination request already exists' })
    async createResignationRequest(@Body() dto: CreateResignationRequestDto) {
        return this.offboardingService.createResignationRequest(dto);
    }

    @Get('resignation-requests/employee/:employeeId')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({
        summary: 'OFF-019: Get resignation requests for employee',
        description: 'Get all resignation requests submitted by employee',
    })
    @ApiParam({ name: 'employeeId', description: 'employee ID' })
    @ApiResponse({ status: 200, description: 'List of resignation requests for the employee' })
    async getResignationRequestByEmployeeId(@Param('employeeId') employeeId: string) {
        return this.offboardingService.getResignationRequestByEmployeeId(employeeId);
    }

    @Get('resignation-requests/employee/:employeeId/workflow-status')
    //@Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'OFF-019: Track resignation request workflow status',
        description: 'Employee tracks their resignation request status through the approval workflow. BR 6: Shows workflow steps (Employee > Line Manager > Finance > HR).',
    })
    @ApiParam({ name: 'employeeId', description: 'Employee ID' })
    @ApiResponse({ status: 200, description: 'Detailed resignation status with workflow tracking' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    async getResignationStatusWithWorkflow(@Param('employeeId') employeeId: string) {
        return this.offboardingService.getResignationStatusWithWorkflow(employeeId);
    }

    // ============================================================
    // Requirement: Clearance, Handover & Access Revocation
    // OFF-006: Offboarding checklist for asset recovery
    // ============================================================

    @Post('clearance-checklists')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'OFF-006: Create clearance checklist',
        description: 'HR Manager creates offboarding checklist for IT assets, ID cards, and equipment recovery. BR 13(a): Clearance checklist required.',
    })
    @ApiBody({ type: CreateClearanceChecklistDto })
    @ApiResponse({ status: 201, description: 'Clearance checklist created successfully' })
    @ApiResponse({ status: 404, description: 'Termination request not found' })
    @ApiResponse({ status: 409, description: 'Clearance checklist already exists' })
    async createClearanceChecklist(@Body() dto: CreateClearanceChecklistDto) {
        return this.offboardingService.createClearanceChecklist(dto);
    }

    @Get('clearance-checklists')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'Get all clearance checklists',
        description: 'Retrieve all clearance checklists',
    })
    @ApiResponse({ status: 200, description: 'List of clearance checklists' })
    async getAllClearanceChecklists() {
        return this.offboardingService.getAllClearanceChecklists();
    }

    @Get('clearance-checklists/:id')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD)
    @ApiOperation({
        summary: 'Get clearance checklist by ID',
        description: 'Retrieve a specific clearance checklist with full details',
    })
    @ApiParam({ name: 'id', description: 'Clearance checklist ID' })
    @ApiResponse({ status: 200, description: 'Clearance checklist details' })
    @ApiResponse({ status: 404, description: 'Clearance checklist not found' })
    async getClearanceChecklistById(@Param('id') id: string) {
        return this.offboardingService.getClearanceChecklistById(id);
    }

    @Get('clearance-checklists/termination/:terminationId')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'Get clearance checklist by termination ID',
        description: 'Retrieve clearance checklist for a specific termination request',
    })
    @ApiParam({ name: 'terminationId', description: 'Termination request ID' })
    @ApiResponse({ status: 200, description: 'Clearance checklist details' })
    @ApiResponse({ status: 404, description: 'Clearance checklist not found' })
    async getClearanceChecklistByTerminationId(@Param('terminationId') terminationId: string) {
        return this.offboardingService.getClearanceChecklistByTerminationId(terminationId);
    }

    @Get('clearance-checklists/:id/status')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_EMPLOYEE)
    @ApiOperation({
        summary: 'Get clearance completion status',
        description: 'Get detailed completion status of a clearance checklist including pending items',
    })
    @ApiParam({ name: 'id', description: 'Clearance checklist ID' })
    @ApiResponse({ status: 200, description: 'Clearance completion status' })
    @ApiResponse({ status: 404, description: 'Clearance checklist not found' })
    async getClearanceCompletionStatus(@Param('id') id: string) {
        return this.offboardingService.getClearanceCompletionStatus(id);
    }

    // ============================================================
    // Requirement: Clearance, Handover & Access Revocation
    // OFF-010: Multi-department exit clearance sign-offs
    // ============================================================

    @Patch('clearance-checklists/:id/items')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD, SystemRole.FINANCE_STAFF)
    @ApiOperation({
        summary: 'OFF-010: Update clearance item (department sign-off)',
        description: 'Department representative updates their clearance sign-off status (IT, Finance, Facilities, Line Manager). BR 13(b, c): Clearance checklist required across departments. BR 14: Final approvals filed to HR.',
    })
    @ApiParam({ name: 'id', description: 'Clearance checklist ID' })
    @ApiBody({ type: UpdateClearanceItemDto })
    @ApiResponse({ status: 200, description: 'Clearance item updated successfully' })
    @ApiResponse({ status: 404, description: 'Clearance checklist or department not found' })
    async updateClearanceItem(
        @Param('id') id: string,
        @Body() dto: UpdateClearanceItemDto,
    ) {
        return this.offboardingService.updateClearanceItem(id, dto);
    }

    @Patch('clearance-checklists/:id/equipment/:equipmentName')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'Update equipment return status',
        description: 'Update the return status of a specific equipment item',
    })
    @ApiParam({ name: 'id', description: 'Clearance checklist ID' })
    @ApiParam({ name: 'equipmentName', description: 'Equipment name' })
    @ApiBody({ type: UpdateEquipmentItemDto })
    @ApiResponse({ status: 200, description: 'Equipment status updated successfully' })
    @ApiResponse({ status: 404, description: 'Clearance checklist or equipment not found' })
    async updateEquipmentItem(
        @Param('id') id: string,
        @Param('equipmentName') equipmentName: string,
        @Body() dto: UpdateEquipmentItemDto,
    ) {
        return this.offboardingService.updateEquipmentItem(id, equipmentName, dto);
    }

    @Post('clearance-checklists/:id/equipment')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'Add equipment to clearance checklist',
        description: 'Add a new equipment item to the clearance checklist',
    })
    @ApiParam({ name: 'id', description: 'Clearance checklist ID' })
    @ApiBody({ type: UpdateEquipmentItemDto })
    @ApiResponse({ status: 200, description: 'Equipment added successfully' })
    @ApiResponse({ status: 404, description: 'Clearance checklist not found' })
    async addEquipmentToChecklist(
        @Param('id') id: string,
        @Body() dto: UpdateEquipmentItemDto,
    ) {
        return this.offboardingService.addEquipmentToChecklist(id, dto);
    }

    @Patch('clearance-checklists/:id/card-return')
    //@Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @ApiOperation({
        summary: 'Update access card return status',
        description: 'Update whether the employee has returned their access card',
    })
    @ApiParam({ name: 'id', description: 'Clearance checklist ID' })
    @ApiBody({ schema: { properties: { cardReturned: { type: 'boolean', example: true } } } })
    @ApiResponse({ status: 200, description: 'Card return status updated successfully' })
    @ApiResponse({ status: 404, description: 'Clearance checklist not found' })
    async updateCardReturn(
        @Param('id') id: string,
        @Body('cardReturned') cardReturned: boolean,
    ) {
        return this.offboardingService.updateCardReturn(id, cardReturned);
    }

    // ============================================================
    // Requirement: Clearance, Handover & Access Revocation
    // OFF-007: System and account access revocation
    // ============================================================

    @Get('pending-access-revocation')
    //@Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
    @ApiOperation({
        summary: 'OFF-007: Get employees pending access revocation',
        description: 'System Admin views list of employees with approved termination who still have active system access. BR 3(c), 19: Security requires timely access revocation.',
    })
    @ApiResponse({ status: 200, description: 'List of employees pending access revocation, sorted by urgency' })
    async getEmployeesPendingAccessRevocation() {
        return this.offboardingService.getEmployeesPendingAccessRevocation();
    }

    @Post('revoke-access')
    //@Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
    @ApiOperation({
        summary: 'OFF-007: Revoke system and account access',
        description: 'System Admin revokes system and account access upon termination. BR 3(c), 19: Access revocation required for security. Connects to ONB-013 (scheduled revocation).',
    })
    @ApiBody({ type: RevokeAccessDto })
    @ApiResponse({ status: 200, description: 'System access revoked successfully' })
    @ApiResponse({ status: 400, description: 'No approved termination request found' })
    async revokeSystemAccess(@Body() dto: RevokeAccessDto) {
        return this.offboardingService.revokeSystemAccess(dto);
    }

    // ============================================================
    // Requirement: Exit Settlements & Benefits
    // OFF-013: Final settlement and benefits termination
    // ============================================================

    @Get('final-settlement/preview/:terminationId')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER)
    @ApiOperation({
        summary: 'OFF-013: Preview final settlement',
        description: 'Preview final settlement calculation before triggering. Shows leave encashment breakdown and benefit amounts. BR 9, 11: Review leave balance and benefits before processing.',
    })
    @ApiParam({ name: 'terminationId', description: 'Termination request ID' })
    @ApiResponse({ status: 200, description: 'Final settlement preview with leave and benefit details' })
    @ApiResponse({ status: 404, description: 'Termination request not found' })
    async previewFinalSettlement(@Param('terminationId') terminationId: string) {
        return this.offboardingService.previewFinalSettlement(terminationId);
    }

    @Post('trigger-final-settlement')
    //@Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER)
    @ApiOperation({
        summary: 'OFF-013: Trigger final settlement',
        description: 'HR Manager triggers benefits termination and final pay calculation (unused leave, deductions). BR 9, 11: Unused annuals encashed, benefits auto-terminated at end of notice period. Triggers service that fills collection relating user to benefit in payroll execution module.',
    })
    @ApiBody({ type: TriggerFinalSettlementDto })
    @ApiResponse({ status: 200, description: 'Final settlement triggered successfully' })
    @ApiResponse({ status: 404, description: 'Termination request not found' })
    @ApiResponse({ status: 400, description: 'Termination not approved or clearance incomplete' })
    async triggerFinalSettlement(@Body() dto: TriggerFinalSettlementDto) {
        return this.offboardingService.triggerFinalSettlement(dto);
    }
}

























// import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
// import { OffboardingService } from '../services/offboarding.service';
// import {
//     CreateTerminationRequestDto,
//     CreateResignationRequestDto,
//     UpdateTerminationStatusDto,
//     CreateClearanceChecklistDto,
//     UpdateClearanceItemDto,
//     UpdateEquipmentItemDto,
//     RevokeAccessDto,
//     TriggerFinalSettlementDto,
// } from '../dto/offboarding';
// import { TerminationStatus } from '../enums/termination-status.enum';
// import { TerminationInitiation } from '../enums/termination-initiation.enum';
// import { AuthenticationGuard } from '../../auth/guards/authentication-guard';
// import { AuthorizationGuard } from '../../auth/guards/authorization-guard';
// import { Roles } from '../../auth/decorators/roles-decorator';
// import { SystemRole } from '../../employee/enums/employee-profile.enums';
//
// @ApiTags('Offboarding')
// @ApiBearerAuth('access-token')
// @Controller('offboarding')
// @UseGuards(AuthenticationGuard, AuthorizationGuard)
// export class OffboardingController {
//     constructor(private readonly offboardingService: OffboardingService) {}
//
//     // ============================================================
//     // Requirement: Termination & Resignation Initiation
//     // OFF-001: HR Manager initiates termination reviews
//     // ============================================================
//
//     @Get('termination-reviews/employee/:employeeId/performance')
//     @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
//     @ApiOperation({
//         summary: 'OFF-001: Get employee performance for termination review',
//         description: 'HR Manager reviews employee performance data (warnings, low scores) from Performance Management before initiating termination. BR 4: Termination reviews based on performance must follow due process.',
//     })
//     @ApiParam({ name: 'employeeId', description: 'Employee ID to review' })
//     @ApiResponse({ status: 200, description: 'Employee performance summary with termination justification' })
//     @ApiResponse({ status: 404, description: 'Employee not found' })
//     async getEmployeePerformanceForTermination(@Param('employeeId') employeeId: string) {
//         return this.offboardingService.getEmployeePerformanceForTermination(employeeId);
//     }
//
//     @Post('termination-requests')
//     @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD)
//     @ApiOperation({
//         summary: 'OFF-001: Create termination request',
//         description: 'HR Manager initiates termination reviews based on warnings and performance data / manager requests. BR 4: employee separation needs an effective date and a clearly stated reason for exit.',
//     })
//     @ApiBody({ type: CreateTerminationRequestDto })
//     @ApiResponse({ status: 201, description: 'Termination request created successfully' })
//     @ApiResponse({ status: 404, description: 'Contract not found' })
//     @ApiResponse({ status: 409, description: 'Active termination request already exists' })
//     async createTerminationRequest(@Body() dto: CreateTerminationRequestDto) {
//         return this.offboardingService.createTerminationRequest(dto);
//     }
//
//     @Get('termination-requests')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'Get all termination requests',
//         description: 'Retrieve all termination requests with optional filtering by employee, status, and initiator',
//     })
//     @ApiQuery({ name: 'employeeId', required: false, description: 'Filter by employee ID' })
//     @ApiQuery({ name: 'status', required: false, enum: TerminationStatus, description: 'Filter by status' })
//     @ApiQuery({ name: 'initiator', required: false, enum: TerminationInitiation, description: 'Filter by initiator (employee, hr, manager)' })
//     @ApiResponse({ status: 200, description: 'List of termination requests' })
//     async getAllTerminationRequests(
//         @Query('employeeId') employeeId?: string,
//         @Query('status') status?: TerminationStatus,
//         @Query('initiator') initiator?: TerminationInitiation,
//     ) {
//         return this.offboardingService.getAllTerminationRequests(employeeId, status, initiator);
//     }
//
//     @Get('termination-requests/by-initiator/:initiator')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'Get termination requests by initiator',
//         description: 'Get all termination/resignation requests filtered by initiator (employee=resignations, hr/manager=terminations)',
//     })
//     @ApiParam({ name: 'initiator', enum: TerminationInitiation, description: 'Initiator type: employee, hr, or manager' })
//     @ApiQuery({ name: 'status', required: false, enum: TerminationStatus, description: 'Optional status filter' })
//     @ApiResponse({ status: 200, description: 'List of termination requests by initiator' })
//     async getTerminationRequestsByInitiator(
//         @Param('initiator') initiator: TerminationInitiation,
//         @Query('status') status?: TerminationStatus,
//     ) {
//         return this.offboardingService.getTerminationRequestsByInitiator(initiator, status);
//     }
//
//     @Get('resignation-requests/all')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'Get all resignation requests',
//         description: 'Get all employee-initiated resignation requests (convenience endpoint)',
//     })
//     @ApiQuery({ name: 'status', required: false, enum: TerminationStatus, description: 'Optional status filter' })
//     @ApiResponse({ status: 200, description: 'List of all resignation requests' })
//     async getAllResignationRequests(@Query('status') status?: TerminationStatus) {
//         return this.offboardingService.getAllResignationRequests(status);
//     }
//
//     @Get('termination-requests/by-status/:status')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'Get termination requests by status',
//         description: 'Get all termination/resignation requests with a specific status across all initiators',
//     })
//     @ApiParam({ name: 'status', enum: TerminationStatus, description: 'Status: pending, under_review, approved, or rejected' })
//     @ApiResponse({ status: 200, description: 'List of termination requests with specified status' })
//     async getTerminationRequestsByStatus(@Param('status') status: TerminationStatus) {
//         return this.offboardingService.getTerminationRequestsByStatus(status);
//     }
//
//     @Get('termination-requests/:id')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_EMPLOYEE)
//     @ApiOperation({
//         summary: 'Get termination request by ID',
//         description: 'Retrieve a specific termination request with full details',
//     })
//     @ApiParam({ name: 'id', description: 'Termination request ID' })
//     @ApiResponse({ status: 200, description: 'Termination request details' })
//     @ApiResponse({ status: 404, description: 'Termination request not found' })
//     async getTerminationRequestById(@Param('id') id: string) {
//         return this.offboardingService.getTerminationRequestById(id);
//     }
//
//     @Patch('termination-requests/:id/status')
//     @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.FINANCE_STAFF)
//     @ApiOperation({
//         summary: 'Update termination request status',
//         description: 'Update the status of a termination request (workflow approval process)',
//     })
//     @ApiParam({ name: 'id', description: 'Termination request ID' })
//     @ApiBody({ type: UpdateTerminationStatusDto })
//     @ApiResponse({ status: 200, description: 'Termination request status updated' })
//     @ApiResponse({ status: 404, description: 'Termination request not found' })
//     @ApiResponse({ status: 400, description: 'Invalid status transition' })
//     async updateTerminationStatus(
//         @Param('id') id: string,
//         @Body() dto: UpdateTerminationStatusDto,
//     ) {
//         return this.offboardingService.updateTerminationStatus(id, dto);
//     }
//
//     @Delete('termination-requests/:id')
//     @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'Delete termination request',
//         description: 'Delete a termination request (only if not approved/rejected)',
//     })
//     @ApiParam({ name: 'id', description: 'Termination request ID' })
//     @ApiResponse({ status: 200, description: 'Termination request deleted successfully' })
//     @ApiResponse({ status: 404, description: 'Termination request not found' })
//     @ApiResponse({ status: 400, description: 'Cannot delete approved termination request' })
//     async deleteTerminationRequest(@Param('id') id: string) {
//         return this.offboardingService.deleteTerminationRequest(id);
//     }
//
//     // ============================================================
//     // Requirement: Termination & Resignation Initiation
//     // OFF-018, OFF-019: employee resignation requests
//     // ============================================================
//
//     @Post('resignation-requests')
//     @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'OFF-018: Create resignation request',
//         description: 'employee submits resignation request with reasoning. BR 6: employee separation can be triggered by resignation with identified approval workflow (employee > Line Manager > Financial approval > HR processing/approval).',
//     })
//     @ApiBody({ type: CreateResignationRequestDto })
//     @ApiResponse({ status: 201, description: 'Resignation request created successfully' })
//     @ApiResponse({ status: 404, description: 'Contract not found' })
//     @ApiResponse({ status: 409, description: 'Active resignation/termination request already exists' })
//     async createResignationRequest(@Body() dto: CreateResignationRequestDto) {
//         return this.offboardingService.createResignationRequest(dto);
//     }
//
//     @Get('resignation-requests/employee/:employeeId')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD)
//     @ApiOperation({
//         summary: 'OFF-019: Get resignation requests for employee',
//         description: 'Get all resignation requests submitted by employee',
//     })
//     @ApiParam({ name: 'employeeId', description: 'employee ID' })
//     @ApiResponse({ status: 200, description: 'List of resignation requests for the employee' })
//     async getResignationRequestByEmployeeId(@Param('employeeId') employeeId: string) {
//         return this.offboardingService.getResignationRequestByEmployeeId(employeeId);
//     }
//
//     @Get('resignation-requests/employee/:employeeId/workflow-status')
//     @Roles(SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD, SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'OFF-019: Track resignation request workflow status',
//         description: 'Employee tracks their resignation request status through the approval workflow. BR 6: Shows workflow steps (Employee > Line Manager > Finance > HR).',
//     })
//     @ApiParam({ name: 'employeeId', description: 'Employee ID' })
//     @ApiResponse({ status: 200, description: 'Detailed resignation status with workflow tracking' })
//     @ApiResponse({ status: 404, description: 'Employee not found' })
//     async getResignationStatusWithWorkflow(@Param('employeeId') employeeId: string) {
//         return this.offboardingService.getResignationStatusWithWorkflow(employeeId);
//     }
//
//     // ============================================================
//     // Requirement: Clearance, Handover & Access Revocation
//     // OFF-006: Offboarding checklist for asset recovery
//     // ============================================================
//
//     @Post('clearance-checklists')
//     @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'OFF-006: Create clearance checklist',
//         description: 'HR Manager creates offboarding checklist for IT assets, ID cards, and equipment recovery. BR 13(a): Clearance checklist required.',
//     })
//     @ApiBody({ type: CreateClearanceChecklistDto })
//     @ApiResponse({ status: 201, description: 'Clearance checklist created successfully' })
//     @ApiResponse({ status: 404, description: 'Termination request not found' })
//     @ApiResponse({ status: 409, description: 'Clearance checklist already exists' })
//     async createClearanceChecklist(@Body() dto: CreateClearanceChecklistDto) {
//         return this.offboardingService.createClearanceChecklist(dto);
//     }
//
//     @Get('clearance-checklists')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'Get all clearance checklists',
//         description: 'Retrieve all clearance checklists',
//     })
//     @ApiResponse({ status: 200, description: 'List of clearance checklists' })
//     async getAllClearanceChecklists() {
//         return this.offboardingService.getAllClearanceChecklists();
//     }
//
//     @Get('clearance-checklists/:id')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_EMPLOYEE, SystemRole.DEPARTMENT_HEAD)
//     @ApiOperation({
//         summary: 'Get clearance checklist by ID',
//         description: 'Retrieve a specific clearance checklist with full details',
//     })
//     @ApiParam({ name: 'id', description: 'Clearance checklist ID' })
//     @ApiResponse({ status: 200, description: 'Clearance checklist details' })
//     @ApiResponse({ status: 404, description: 'Clearance checklist not found' })
//     async getClearanceChecklistById(@Param('id') id: string) {
//         return this.offboardingService.getClearanceChecklistById(id);
//     }
//
//     @Get('clearance-checklists/termination/:terminationId')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'Get clearance checklist by termination ID',
//         description: 'Retrieve clearance checklist for a specific termination request',
//     })
//     @ApiParam({ name: 'terminationId', description: 'Termination request ID' })
//     @ApiResponse({ status: 200, description: 'Clearance checklist details' })
//     @ApiResponse({ status: 404, description: 'Clearance checklist not found' })
//     async getClearanceChecklistByTerminationId(@Param('terminationId') terminationId: string) {
//         return this.offboardingService.getClearanceChecklistByTerminationId(terminationId);
//     }
//
//     @Get('clearance-checklists/:id/status')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_EMPLOYEE)
//     @ApiOperation({
//         summary: 'Get clearance completion status',
//         description: 'Get detailed completion status of a clearance checklist including pending items',
//     })
//     @ApiParam({ name: 'id', description: 'Clearance checklist ID' })
//     @ApiResponse({ status: 200, description: 'Clearance completion status' })
//     @ApiResponse({ status: 404, description: 'Clearance checklist not found' })
//     async getClearanceCompletionStatus(@Param('id') id: string) {
//         return this.offboardingService.getClearanceCompletionStatus(id);
//     }
//
//     // ============================================================
//     // Requirement: Clearance, Handover & Access Revocation
//     // OFF-010: Multi-department exit clearance sign-offs
//     // ============================================================
//
//     @Patch('clearance-checklists/:id/items')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.DEPARTMENT_HEAD, SystemRole.FINANCE_STAFF)
//     @ApiOperation({
//         summary: 'OFF-010: Update clearance item (department sign-off)',
//         description: 'Department representative updates their clearance sign-off status (IT, Finance, Facilities, Line Manager). BR 13(b, c): Clearance checklist required across departments. BR 14: Final approvals filed to HR.',
//     })
//     @ApiParam({ name: 'id', description: 'Clearance checklist ID' })
//     @ApiBody({ type: UpdateClearanceItemDto })
//     @ApiResponse({ status: 200, description: 'Clearance item updated successfully' })
//     @ApiResponse({ status: 404, description: 'Clearance checklist or department not found' })
//     async updateClearanceItem(
//         @Param('id') id: string,
//         @Body() dto: UpdateClearanceItemDto,
//     ) {
//         return this.offboardingService.updateClearanceItem(id, dto);
//     }
//
//     @Patch('clearance-checklists/:id/equipment/:equipmentName')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'Update equipment return status',
//         description: 'Update the return status of a specific equipment item',
//     })
//     @ApiParam({ name: 'id', description: 'Clearance checklist ID' })
//     @ApiParam({ name: 'equipmentName', description: 'Equipment name' })
//     @ApiBody({ type: UpdateEquipmentItemDto })
//     @ApiResponse({ status: 200, description: 'Equipment status updated successfully' })
//     @ApiResponse({ status: 404, description: 'Clearance checklist or equipment not found' })
//     async updateEquipmentItem(
//         @Param('id') id: string,
//         @Param('equipmentName') equipmentName: string,
//         @Body() dto: UpdateEquipmentItemDto,
//     ) {
//         return this.offboardingService.updateEquipmentItem(id, equipmentName, dto);
//     }
//
//     @Post('clearance-checklists/:id/equipment')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'Add equipment to clearance checklist',
//         description: 'Add a new equipment item to the clearance checklist',
//     })
//     @ApiParam({ name: 'id', description: 'Clearance checklist ID' })
//     @ApiBody({ type: UpdateEquipmentItemDto })
//     @ApiResponse({ status: 200, description: 'Equipment added successfully' })
//     @ApiResponse({ status: 404, description: 'Clearance checklist not found' })
//     async addEquipmentToChecklist(
//         @Param('id') id: string,
//         @Body() dto: UpdateEquipmentItemDto,
//     ) {
//         return this.offboardingService.addEquipmentToChecklist(id, dto);
//     }
//
//     @Patch('clearance-checklists/:id/card-return')
//     @Roles(SystemRole.HR_EMPLOYEE, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
//     @ApiOperation({
//         summary: 'Update access card return status',
//         description: 'Update whether the employee has returned their access card',
//     })
//     @ApiParam({ name: 'id', description: 'Clearance checklist ID' })
//     @ApiBody({ schema: { properties: { cardReturned: { type: 'boolean', example: true } } } })
//     @ApiResponse({ status: 200, description: 'Card return status updated successfully' })
//     @ApiResponse({ status: 404, description: 'Clearance checklist not found' })
//     async updateCardReturn(
//         @Param('id') id: string,
//         @Body('cardReturned') cardReturned: boolean,
//     ) {
//         return this.offboardingService.updateCardReturn(id, cardReturned);
//     }
//
//     // ============================================================
//     // Requirement: Clearance, Handover & Access Revocation
//     // OFF-007: System and account access revocation
//     // ============================================================
//
//     @Get('pending-access-revocation')
//     @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER)
//     @ApiOperation({
//         summary: 'OFF-007: Get employees pending access revocation',
//         description: 'System Admin views list of employees with approved termination who still have active system access. BR 3(c), 19: Security requires timely access revocation.',
//     })
//     @ApiResponse({ status: 200, description: 'List of employees pending access revocation, sorted by urgency' })
//     async getEmployeesPendingAccessRevocation() {
//         return this.offboardingService.getEmployeesPendingAccessRevocation();
//     }
//
//     @Post('revoke-access')
//     @Roles(SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN)
//     @ApiOperation({
//         summary: 'OFF-007: Revoke system and account access',
//         description: 'System Admin revokes system and account access upon termination. BR 3(c), 19: Access revocation required for security. Connects to ONB-013 (scheduled revocation).',
//     })
//     @ApiBody({ type: RevokeAccessDto })
//     @ApiResponse({ status: 200, description: 'System access revoked successfully' })
//     @ApiResponse({ status: 400, description: 'No approved termination request found' })
//     async revokeSystemAccess(@Body() dto: RevokeAccessDto) {
//         return this.offboardingService.revokeSystemAccess(dto);
//     }
//
//     // ============================================================
//     // Requirement: Exit Settlements & Benefits
//     // OFF-013: Final settlement and benefits termination
//     // ============================================================
//
//     @Get('final-settlement/preview/:terminationId')
//     @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER)
//     @ApiOperation({
//         summary: 'OFF-013: Preview final settlement',
//         description: 'Preview final settlement calculation before triggering. Shows leave encashment breakdown and benefit amounts. BR 9, 11: Review leave balance and benefits before processing.',
//     })
//     @ApiParam({ name: 'terminationId', description: 'Termination request ID' })
//     @ApiResponse({ status: 200, description: 'Final settlement preview with leave and benefit details' })
//     @ApiResponse({ status: 404, description: 'Termination request not found' })
//     async previewFinalSettlement(@Param('terminationId') terminationId: string) {
//         return this.offboardingService.previewFinalSettlement(terminationId);
//     }
//
//     @Post('trigger-final-settlement')
//     @Roles(SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN, SystemRole.PAYROLL_MANAGER)
//     @ApiOperation({
//         summary: 'OFF-013: Trigger final settlement',
//         description: 'HR Manager triggers benefits termination and final pay calculation (unused leave, deductions). BR 9, 11: Unused annuals encashed, benefits auto-terminated at end of notice period. Triggers service that fills collection relating user to benefit in payroll execution module.',
//     })
//     @ApiBody({ type: TriggerFinalSettlementDto })
//     @ApiResponse({ status: 200, description: 'Final settlement triggered successfully' })
//     @ApiResponse({ status: 404, description: 'Termination request not found' })
//     @ApiResponse({ status: 400, description: 'Termination not approved or clearance incomplete' })
//     async triggerFinalSettlement(@Body() dto: TriggerFinalSettlementDto) {
//         return this.offboardingService.triggerFinalSettlement(dto);
//     }
// }
//
