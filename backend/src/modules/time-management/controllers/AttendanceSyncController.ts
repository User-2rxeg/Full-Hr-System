import { Controller, Post, Get, Body, Query, Param, Patch } from '@nestjs/common';
import {ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiParam} from '@nestjs/swagger';
import { AttendanceSyncService } from '../services/AttendanceSyncService';
import {GetEscalatedResponse, TriggerEscalationDto, TriggerEscalationResponse} from "../dto/escalation";

@ApiTags('Attendance Sync')
@Controller('attendance-sync')
export class AttendanceSyncController {
    constructor(private readonly syncService: AttendanceSyncService) {}

    @Post('sync-date')
    @ApiOperation({
        summary: 'Manually sync attendance for specific date',
        description: 'Triggers manual sync of attendance records for a specific date to payroll and leave systems'
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['date'],
            properties: {
                date: {
                    type: 'string',
                    example: '2025-12-01',
                    description: 'Date to sync (YYYY-MM-DD)'
                }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Sync completed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid date format' })
    async syncSpecificDate(@Body() dto: { date: string }) {
        const date = new Date(dto.date);
        return this.syncService.syncAttendanceForDate(date);
    }

    @Post('sync-range')
    @ApiOperation({
        summary: 'Manually sync attendance for date range',
        description: 'Triggers manual sync of attendance records for a date range to payroll and leave systems'
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['startDate', 'endDate'],
            properties: {
                startDate: {
                    type: 'string',
                    example: '2025-12-01',
                    description: 'Start date (YYYY-MM-DD)'
                },
                endDate: {
                    type: 'string',
                    example: '2025-12-31',
                    description: 'End date (YYYY-MM-DD)'
                }
            }
        },
        examples: {
            'Month Sync': {
                summary: 'Sync full month',
                value: {
                    startDate: '2025-12-01',
                    endDate: '2025-12-31'
                }
            },
            'Week Sync': {
                summary: 'Sync one week',
                value: {
                    startDate: '2025-12-01',
                    endDate: '2025-12-07'
                }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Range sync completed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid date range' })
    async syncDateRange(@Body() dto: { startDate: string; endDate: string }) {
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);
        return this.syncService.syncDateRange(startDate, endDate);
    }

    @Get('conflicts')
    @ApiOperation({
        summary: 'Get sync conflicts',
        description: 'Retrieve attendance/leave sync conflicts that need resolution'
    })
    @ApiQuery({ name: 'employeeId', required: false, description: 'Filter by employee ID' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'resolved', required: false, description: 'Filter by resolved status (true/false)' })
    @ApiResponse({
        status: 200,
        description: 'List of sync conflicts',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    employeeId: { type: 'string' },
                    date: { type: 'string' },
                    conflictType: { type: 'string' },
                    workMinutes: { type: 'number' },
                    leaveType: { type: 'string' },
                    resolved: { type: 'boolean' }
                }
            }
        }
    })
    async getSyncConflicts(
        @Query('employeeId') employeeId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('resolved') resolved?: string,
    ) {
        const filters: any = {};
        if (employeeId) filters.employeeId = employeeId;
        if (startDate) filters.startDate = new Date(startDate);
        if (endDate) filters.endDate = new Date(endDate);
        if (resolved !== undefined) filters.resolved = resolved === 'true';

        return this.syncService.getSyncConflicts(filters);
    }

    @Patch('conflicts/:id/resolve')
    @ApiOperation({
        summary: 'Resolve a sync conflict',
        description: 'Resolve attendance/leave conflict by choosing an action'
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['action', 'resolvedBy'],
            properties: {
                action: {
                    type: 'string',
                    enum: ['KEEP_ATTENDANCE', 'KEEP_LEAVE', 'CONVERT_TO_HALF_DAY', 'MANUAL_REVIEW'],
                    description: 'Resolution action'
                },
                note: {
                    type: 'string',
                    description: 'Optional note about resolution'
                },
                resolvedBy: {
                    type: 'string',
                    description: 'ID of user resolving the conflict'
                }
            }
        },
        examples: {
            'Keep Attendance': {
                summary: 'Cancel leave, keep attendance',
                value: {
                    action: 'KEEP_ATTENDANCE',
                    note: 'Employee was present, verified by manager',
                    resolvedBy: '674c1a1b2c3d4e5f6a7b8c8a'
                }
            },
            'Keep Leave': {
                summary: 'Invalidate attendance, keep leave',
                value: {
                    action: 'KEEP_LEAVE',
                    note: 'Invalid punch, employee confirmed on leave',
                    resolvedBy: '674c1a1b2c3d4e5f6a7b8c8a'
                }
            },
            'Half Day': {
                summary: 'Convert to half-day leave',
                value: {
                    action: 'CONVERT_TO_HALF_DAY',
                    note: 'Employee worked half day',
                    resolvedBy: '674c1a1b2c3d4e5f6a7b8c8a'
                }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Conflict resolved successfully' })
    @ApiResponse({ status: 404, description: 'Conflict not found' })
    async resolveConflict(
        @Param('id') id: string,
        @Body() resolution: {
            action: 'KEEP_ATTENDANCE' | 'KEEP_LEAVE' | 'CONVERT_TO_HALF_DAY' | 'MANUAL_REVIEW';
            note?: string;
            resolvedBy: string;
        }
    ) {
        await this.syncService.resolveConflict(id, resolution);
        return {
            message: 'Conflict resolved successfully',
            conflictId: id,
            action: resolution.action
        };
    }

    @Get('statistics')
    @ApiOperation({
        summary: 'Get sync statistics',
        description: 'Get statistics about attendance sync operations'
    })
    @ApiQuery({ name: 'startDate', required: false, description: 'Statistics start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'Statistics end date (YYYY-MM-DD)' })
    @ApiResponse({
        status: 200,
        description: 'Sync statistics',
        schema: {
            type: 'object',
            properties: {
                period: { type: 'object' },
                totalRecords: { type: 'number' },
                syncedToPayroll: { type: 'number' },
                syncedToLeave: { type: 'number' },
                payrollSyncRate: { type: 'string' },
                leaveSyncRate: { type: 'string' },
                totalConflicts: { type: 'number' },
                unresolvedConflicts: { type: 'number' }
            }
        }
    })
    async getSyncStatistics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.syncService.getSyncStatistics(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined
        );
    }

    @Get('employees/:employeeId/absence-count')
    @ApiOperation({
        summary: 'Count absences for an employee in a date range',
        description: 'Returns the count of absences (ABSENT status) for a specific employee within a date range'
    })
    @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)', example: '2025-12-01' })
    @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)', example: '2025-12-31' })
    @ApiResponse({
        status: 200,
        description: 'Absence count result',
        schema: {
            type: 'object',
            properties: {
                employeeId: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                totalDays: { type: 'number' },
                absenceDays: { type: 'number' },
                presentDays: { type: 'number' },
                holidayDays: { type: 'number' },
                restDays: { type: 'number' },
                noShiftDays: { type: 'number' },
                scheduledDayOffDays: { type: 'number' },
                absenceRate: { type: 'number' },
                absences: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            date: { type: 'string' },
                            status: { type: 'string' },
                            reason: { type: 'string' }
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid employee ID or date format' })
    @ApiResponse({ status: 404, description: 'Employee not found' })
    async countAbsencesByDateRange(
        @Param('employeeId') employeeId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        if (!startDate || !endDate) {
            throw new Error('startDate and endDate query parameters are required');
        }

        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            throw new Error('Invalid date format. Please use YYYY-MM-DD format');
        }

        if (parsedStartDate > parsedEndDate) {
            throw new Error('Start date must be before or equal to end date');
        }

        return this.syncService.countAbsencesByDateRange(employeeId, parsedStartDate, parsedEndDate);
    }

    @Post('time-requests/escalate')
    @ApiOperation({
        summary: 'Manually escalate pending time requests before payroll cut-off',
        description: 'Triggers manual escalation of pending leave requests and time exceptions that have not been reviewed before the monthly payroll cut-off date'
    })
    @ApiResponse({
        status: 200,
        description: 'Time requests escalated successfully',
        schema: {
            type: 'object',
            properties: {
                leaveEscalations: { type: 'number', description: 'Number of leave requests escalated' },
                exceptionEscalations: { type: 'number', description: 'Number of time exceptions escalated' },
            }
        }
    })
    @ApiResponse({ status: 500, description: 'Escalation failed' })
    async escalateTimeRequests() {
        // Call the existing escalation method on the service
        return await this.syncService.escalatePendingTimeRequests();
    }

    /**
     * Trigger escalation of pending time requests to HR Admin
     */
    @Post('escalate/trigger')
    @ApiOperation({
        summary: 'Trigger escalation of pending time requests',
        description: 'Escalates all SUBMITTED/PENDING requests to specified HR Admin X days before payroll period. Creates single notification with all request IDs.'
    })
    @ApiResponse({
        status: 200,
        description: 'Escalation triggered successfully',
        type: TriggerEscalationResponse
    })
    @ApiResponse({ status: 400, description: 'Invalid parameters' })
    @ApiResponse({ status: 404, description: 'Payroll or HR Admin not found' })
    async triggerEscalation(
        @Body() dto: TriggerEscalationDto
    ): Promise<TriggerEscalationResponse> {
        return this.syncService.triggerEscalation(
            dto.daysBeforePayroll,
            dto.hrAdminId,
            dto.payrollRunId
        );
    }

    /**
     * Get all requests escalated to a specific HR Admin
     */
    @Get('escalate/to/:hrAdminId')
    @ApiOperation({
        summary: 'Get all requests escalated to HR Admin',
        description: 'Returns all time requests (corrections, exceptions, break permissions) escalated to specified HR Admin'
    })
    @ApiParam({
        name: 'hrAdminId',
        description: 'HR Admin user ID',
        example: '507f1f77bcf86cd799439011'
    })
    @ApiResponse({
        status: 200,
        description: 'Escalated requests retrieved successfully',
        type: GetEscalatedResponse
    })
    @ApiResponse({ status: 400, description: 'Invalid HR Admin ID' })
    async getEscalatedRequests(
        @Param('hrAdminId') hrAdminId: string
    ): Promise<GetEscalatedResponse> {
        return this.syncService.getEscalatedRequests(hrAdminId);
    }
}





// // src/controllers/AttendanceSyncController.ts
// import { Controller, Post, Get, Query, Body, Param } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
// import {
//     AttendanceSyncService,
//     SyncResult,
//     DateRangeSyncResult,
//     SyncStatistics
// } from '../services/AttendanceSyncService';
//
// @ApiTags('Attendance Sync')
// @Controller('attendance-sync')
// export class AttendanceSyncController {
//     constructor(private readonly syncService: AttendanceSyncService) {}
//
//     @Post('daily')
//     @ApiOperation({ summary: 'Trigger daily sync for yesterday' })
//     async triggerDailySync(): Promise<SyncResult> {
//         return this.syncService.triggerSyncForYesterday();
//     }
//
//     @Post('range')
//     @ApiOperation({ summary: 'Sync date range manually' })
//     @ApiQuery({ name: 'startDate', type: Date, required: true, example: '2024-01-01' })
//     @ApiQuery({ name: 'endDate', type: Date, required: true, example: '2024-01-31' })
//     async syncDateRange(
//         @Query('startDate') startDate: Date,
//         @Query('endDate') endDate: Date,
//     ): Promise<DateRangeSyncResult> {
//         return this.syncService.syncDateRange(startDate, endDate);
//     }
//
//     @Get('conflicts')
//     @ApiOperation({ summary: 'Get sync conflicts (absence notifications)' })
//     @ApiQuery({ name: 'startDate', type: Date, required: false })
//     @ApiQuery({ name: 'endDate', type: Date, required: false })
//     async getSyncConflicts(
//         @Query('startDate') startDate?: Date,
//         @Query('endDate') endDate?: Date,
//     ) {
//         return this.syncService.getSyncConflicts({ startDate, endDate });
//     }
//
//     @Post('conflicts/:id/resolve')
//     @ApiOperation({ summary: 'Resolve a conflict' })
//     @ApiBody({
//         schema: {
//             type: 'object',
//             required: ['resolvedBy', 'action'],
//             properties: {
//                 action: {
//                     type: 'string',
//                     enum: ['KEEP_ATTENDANCE', 'KEEP_LEAVE', 'CONVERT_TO_HALF_DAY', 'MANUAL_REVIEW']
//                 },
//                 note: { type: 'string' },
//                 resolvedBy: { type: 'string' }
//             }
//         }
//     })
//     async resolveConflict(
//         @Param('id') id: string,
//         @Body() resolution: any,
//     ) {
//         await this.syncService.resolveConflict(id, resolution);
//         return { success: true, message: 'Conflict resolved' };
//     }
//
//     @Get('statistics')
//     @ApiOperation({ summary: 'Get sync statistics' })
//     @ApiQuery({ name: 'startDate', type: Date, required: false })
//     @ApiQuery({ name: 'endDate', type: Date, required: false })
//     async getSyncStatistics(
//         @Query('startDate') startDate?: Date,
//         @Query('endDate') endDate?: Date,
//     ): Promise<SyncStatistics> {
//         return this.syncService.getSyncStatistics(startDate, endDate);
//     }
//}