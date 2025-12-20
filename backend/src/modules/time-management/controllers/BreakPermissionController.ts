import { Controller, Post, Get, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {BreakPermissionService} from "../services/BreakPermissionService";
import {ApproveBreakPermissionDto, BreakPermissionDto, RejectBreakPermissionDto} from "../dto/BreakPermissionDto";
import { PermissionLimitDto } from '../dto/BreakPermissionDto';

@ApiTags('Break Permissions')
@Controller('break-permissions')
export class BreakPermissionController {
    constructor(private readonly breakPermissionService: BreakPermissionService) {}

    @Post()
    // @UseGuards(AuthenticationGuard,AuthorizationGuard)
    // @Roles(SystemRole.HR_ADMIN)
    // @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Create a break permission request' })
    @ApiResponse({ status: 201, description: 'Break permission created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid request data' })
    async createBreakPermission(@Body() dto: BreakPermissionDto) {
        return this.breakPermissionService.createBreakPermission(dto);
    }

    @Get('limit')
    @ApiOperation({ summary: 'Get current max break/permission duration limit' })
    async getPermissionLimit() {
        return this.breakPermissionService.getPermissionMaxLimit();
    }

    @Post('limit')
    @ApiOperation({ summary: 'Set the max break/permission duration limit' })
    async setPermissionLimit(@Body() dto: PermissionLimitDto) {
        return this.breakPermissionService.setPermissionMaxLimit(dto.maxMinutes);
    }

    @Get('attendance/:attendanceRecordId/approved-minutes')
    @ApiOperation({ summary: 'Get approved break minutes for an attendance record' })
    async getApprovedBreakMinutes(@Param('attendanceRecordId') attendanceRecordId: string) {
        const minutes = await this.breakPermissionService.calculateApprovedBreakMinutes(attendanceRecordId);
        return { attendanceRecordId, approvedBreakMinutes: minutes };
    }

    @Get('employee/:employeeId')
    @ApiOperation({ summary: 'Get break permissions for a specific employee' })
    async getEmployeeBreakPermissions(@Param('employeeId') employeeId: string) {
        return this.breakPermissionService.getEmployeeBreakPermissions(employeeId);
    }

    @Post(':permissionId/approve')
    // @UseGuards(AuthenticationGuard,AuthorizationGuard)
    // @Roles(SystemRole.HR_ADMIN, SystemRole.Department_HEAD)
    // @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Approve a break permission' })
    async approveBreakPermission(
        @Param('permissionId') permissionId: string,
        @Body() dto: ApproveBreakPermissionDto
    ) {
        return this.breakPermissionService.approveBreakPermission(permissionId, dto.approvedBy);
    }

    @Post(':permissionId/reject')
    @ApiOperation({ summary: 'Reject a break permission' })
    async rejectBreakPermission(
        @Param('permissionId') permissionId: string,
        @Body() dto: RejectBreakPermissionDto
    ) {
        return this.breakPermissionService.rejectBreakPermission(permissionId, dto.rejectionReason);
    }

    @Delete(':employeeId/:permissionId')
    @ApiOperation({ summary: 'Delete a break permission' })
    async deleteBreakPermission(
        @Param('employeeId') employeeId: string,
        @Param('permissionId') permissionId: string
    ) {
        return this.breakPermissionService.deleteBreakPermission(employeeId, permissionId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all break permissions with optional filters' })
    async getAllBreakPermissions(
        @Query('employeeId') employeeId?: string,
        @Query('status') status?: string
    ) {
        return this.breakPermissionService.getAllBreakPermissions(employeeId, status);
    }
}