// src/time-management/attendance/attendance.controller.ts

import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    Put,
    Query,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import {
    PunchInDto,
    PunchOutDto,
    UpdateAttendanceRecordDto,
    CorrectAttendanceDto,
    BulkReviewAttendanceDto,
    CreateAttendanceRecordDto,
} from '../dto/AttendanceDtos';
import { AttendanceService } from "../services/AttendanceService";

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) {}

    // --------------------------------------------------
    // PUNCH IN
    // -
    //-------------------------------------------------
    @Post('punch-in')
    @ApiOperation({ summary: 'Punch In', description: 'Record employee clock-in time' })
    @ApiBody({ type: PunchInDto })
    @ApiResponse({ status: 201, description: 'Successfully punched in' })
    @ApiResponse({ status: 400, description: 'Bad request - employeeId is required' })
    async punchIn(@Body() dto: PunchInDto) {
        if (!dto.employeeId)
            throw new BadRequestException('employeeId is required');
        return this.attendanceService.punchIn(dto);
    }

    // --------------------------------------------------
    // PUNCH OUT
    // --------------------------------------------------
    @Post('punch-out')
    @ApiOperation({ summary: 'Punch Out', description: 'Record employee clock-out time' })
    @ApiBody({ type: PunchOutDto })
    @ApiResponse({ status: 201, description: 'Successfully punched out' })
    @ApiResponse({ status: 400, description: 'Bad request - employeeId is required' })
    async punchOut(@Body() dto: PunchOutDto) {
        if (!dto.employeeId)
            throw new BadRequestException('employeeId is required');
        return this.attendanceService.punchOut(dto);
    }

    // --------------------------------------------------
    // Get today's attendance for employee
    // --------------------------------------------------
    @Get('today/:employeeId')
    async getToday(@Param('employeeId') employeeId: string) {
        return this.attendanceService.getTodayRecord(employeeId);
    }

    // --------------------------------------------------
    // Get monthly attendance (employee)
    // --------------------------------------------------
    @Get('month/:employeeId')
    async getMonthly(
        @Param('employeeId') employeeId: string,
        @Query('month') month: string,
        @Query('year') year: string,
    ) {
        const m = Number(month);
        const y = Number(year);
        if (!m || !y) throw new BadRequestException('month and year required');
        return this.attendanceService.getMonthlyAttendance(employeeId, m, y);
    }

    // --------------------------------------------------
    // Get payroll-ready attendance
    // --------------------------------------------------
    @Get('payroll')
    async payroll(
        @Query('month') month: string,
        @Query('year') year: string,
    ) {
        const m = Number(month);
        const y = Number(year);
        if (!m || !y) throw new BadRequestException('month and year required');
        return this.attendanceService.getPayrollReadyAttendance(m, y);
    }

    // --------------------------------------------------
    // Update attendance record
    // --------------------------------------------------
    @Put(':id')
    async updateRecord(
        @Param('id') id: string,
        @Body() dto: UpdateAttendanceRecordDto,
    ) {
        return this.attendanceService.updateAttendanceRecord(id, dto);
    }

    // --------------------------------------------------
    // ATTENDANCE REVIEW & CORRECTION
    // --------------------------------------------------

    @Post('review/:recordId')
    @ApiOperation({
        summary: 'Review Attendance Record',
        description: 'Review a single attendance record for missing punches, invalid sequences, and other issues'
    })
    @ApiResponse({
        status: 200,
        description: 'Attendance record reviewed with issues identified',
        schema: {
            type: 'object',
            properties: {
                record: { type: 'object' },
                issues: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['MISSING_PUNCH', 'INVALID_SEQUENCE', 'SHORT_TIME', 'NO_PUNCH_OUT', 'NO_PUNCH_IN', 'HOLIDAY_PUNCH'] },
                            severity: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
                            description: { type: 'string' },
                            suggestion: { type: 'string' }
                        }
                    }
                },
                canFinalize: { type: 'boolean' }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Attendance record not found' })
    async reviewAttendance(@Param('recordId') recordId: string) {
        return this.attendanceService.reviewAttendanceRecord(recordId);
    }
    // @UseGuards(AuthenticationGuard,AuthorizationGuard)
    // @Roles(SystemRole.DEPARTMENT_HEAD)
    // @ApiBearerAuth('access-token')
    @Post('correct')
    @ApiOperation({
        summary: 'Correct Attendance Record',
        description: 'Correct attendance record by adding/removing/modifying punches. Creates audit trail. Default example shows adding missing punch OUT.'
    })
    @ApiBody({
        type: CorrectAttendanceDto,
        description: 'Correction request body with default values pre-filled',
        examples: {
            'Add Missing Punch Out (Default)': {
                summary: 'Add missing punch OUT',
                description: 'Most common scenario - employee forgot to punch out',
                value: {
                    attendanceRecordId: '674c1a1b2c3d4e5f6a7b8c9d',
                    addPunchOut: '01/12/2025 17:00',
                    correctionReason: 'Employee forgot to punch out',
                    correctedBy: '674c1a1b2c3d4e5f6a7b8c8a'
                }
            },
            'Add Missing Punch In': {
                summary: 'Add missing punch IN',
                description: 'System error - punch in not recorded',
                value: {
                    attendanceRecordId: '674c1a1b2c3d4e5f6a7b8c9d',
                    addPunchIn: '01/12/2025 09:00',
                    correctionReason: 'System error - punch in not recorded',
                    correctedBy: '674c1a1b2c3d4e5f6a7b8c8a'
                }
            },
            'Add Both Punches': {
                summary: 'Add both IN and OUT punches',
                description: 'Complete day missing - no punches recorded',
                value: {
                    attendanceRecordId: '674c1a1b2c3d4e5f6a7b8c9d',
                    addPunchIn: '01/12/2025 09:00',
                    addPunchOut: '01/12/2025 17:00',
                    correctionReason: 'No punches recorded - system malfunction',
                    correctedBy: '674c1a1b2c3d4e5f6a7b8c8a'
                }
            },
            'Remove Duplicate Punch': {
                summary: 'Remove duplicate punch',
                description: 'Employee accidentally punched twice',
                value: {
                    attendanceRecordId: '674c1a1b2c3d4e5f6a7b8c9d',
                    removePunchIndex: 2,
                    correctionReason: 'Duplicate punch detected - employee punched twice',
                    correctedBy: '674c1a1b2c3d4e5f6a7b8c8a'
                }
            },
            'Replace All Punches': {
                summary: 'Replace entire punch sequence',
                description: 'Complete correction with new punch data',
                value: {
                    attendanceRecordId: '674c1a1b2c3d4e5f6a7b8c9d',
                    correctedPunches: [
                        { type: 'IN', time: '01/12/2025 09:00' },
                        { type: 'OUT', time: '01/12/2025 17:00' }
                    ],
                    correctionReason: 'Correcting invalid punch sequence',
                    correctedBy: '674c1a1b2c3d4e5f6a7b8c8a'
                }
            },
            'Lunch Break Correction': {
                summary: 'Add lunch break punches',
                description: 'Employee forgot to punch during lunch',
                value: {
                    attendanceRecordId: '674c1a1b2c3d4e5f6a7b8c9d',
                    correctedPunches: [
                        { type: 'IN', time: '01/12/2025 09:00' },
                        { type: 'OUT', time: '01/12/2025 12:30' },
                        { type: 'IN', time: '01/12/2025 13:30' },
                        { type: 'OUT', time: '01/12/2025 17:00' }
                    ],
                    correctionReason: 'Added lunch break punches - employee forgot',
                    correctedBy: '674c1a1b2c3d4e5f6a7b8c8a'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Attendance record corrected successfully',
        schema: {
            type: 'object',
            properties: {
                record: { type: 'object', description: 'Updated attendance record' },
                correctionApplied: { type: 'string', description: 'Description of correction applied' },
                previousState: { type: 'object', description: 'Previous state for audit trail' }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Attendance record not found' })
    @ApiResponse({ status: 400, description: 'Invalid correction parameters' })
    async correctAttendance(@Body() dto: CorrectAttendanceDto) {
        if (!dto.correctionReason) {
            throw new BadRequestException('correctionReason is required');
        }
        return this.attendanceService.correctAttendanceRecord(dto);
    }

    @Post('review/bulk')
    @ApiOperation({
        summary: 'Bulk Review Attendance',
        description: 'Review all attendance records for an employee within a date range. Returns records with issues. Default reviews all issues for December 2025.'
    })
    @ApiBody({
        type: BulkReviewAttendanceDto,
        description: 'Bulk review request with default values pre-filled for December 2025',
        examples: {
            'All Issues (Default)': {
                summary: 'Review all issues for December',
                description: 'Default - reviews all attendance issues in December 2025',
                value: {
                    employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
                    startDate: '2025-12-01',
                    endDate: '2025-12-31',
                    filterByIssue: 'ALL'
                }
            },
            'Missing Punches Only': {
                summary: 'Filter missing punches',
                description: 'Shows only records with missing punch IN/OUT',
                value: {
                    employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
                    startDate: '2025-12-01',
                    endDate: '2025-12-31',
                    filterByIssue: 'MISSING_PUNCH'
                }
            },
            'Invalid Sequences Only': {
                summary: 'Filter invalid sequences',
                description: 'Shows only records with consecutive IN or OUT punches',
                value: {
                    employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
                    startDate: '2025-12-01',
                    endDate: '2025-12-31',
                    filterByIssue: 'INVALID_SEQUENCE'
                }
            },
            'Short Time Only': {
                summary: 'Filter short time issues',
                description: 'Shows only records with insufficient work hours',
                value: {
                    employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
                    startDate: '2025-12-01',
                    endDate: '2025-12-31',
                    filterByIssue: 'SHORT_TIME'
                }
            },
            'Weekly Review': {
                summary: 'Review last week',
                description: 'Review attendance for last week of November',
                value: {
                    employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
                    startDate: '2025-11-24',
                    endDate: '2025-11-30',
                    filterByIssue: 'ALL'
                }
            },
            'Single Day': {
                summary: 'Review specific day',
                description: 'Review attendance for a single day',
                value: {
                    employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
                    startDate: '2025-12-01',
                    endDate: '2025-12-01',
                    filterByIssue: 'ALL'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Bulk review completed',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    recordId: { type: 'string' },
                    date: { type: 'string' },
                    issues: { type: 'array' },
                    canFinalize: { type: 'boolean' }
                }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid parameters' })
    async bulkReviewAttendance(@Body() dto: BulkReviewAttendanceDto) {
        if (!dto.employeeId || !dto.startDate || !dto.endDate) {
            throw new BadRequestException('employeeId, startDate, and endDate are required');
        }
        return this.attendanceService.bulkReviewAttendance(dto);
    }

    // --------------------------------------------------
    // CREATE ATTENDANCE RECORD (Department Head)
    // --------------------------------------------------
    @Post('create')
    @ApiOperation({
        summary: 'Create Attendance Record',
        description: 'Manually create an attendance record for an employee (Department Head use). Creates audit trail.'
    })
    @ApiBody({
        type: CreateAttendanceRecordDto,
        description: 'Details for creating a new attendance record',
        examples: {
            'Single Day Record': {
                summary: 'Create single day record',
                description: 'Create attendance for one day with IN and OUT',
                value: {
                    employeeId: '692cdd8e67a40875239080d0',
                    punches: [
                        { type: 'IN', time: '16/12/2025 09:00' },
                        { type: 'OUT', time: '16/12/2025 17:00' }
                    ],
                    createdBy: '674c1a1b2c3d4e5f6a7b8c8a',
                    reason: 'System malfunction - manual creation for missed record'
                }
            },
            'With Lunch Break': {
                summary: 'Create record with lunch break',
                description: 'Create attendance with lunch break punches',
                value: {
                    employeeId: '692cdd8e67a40875239080d0',
                    punches: [
                        { type: 'IN', time: '16/12/2025 09:00' },
                        { type: 'OUT', time: '16/12/2025 12:30' },
                        { type: 'IN', time: '16/12/2025 13:30' },
                        { type: 'OUT', time: '16/12/2025 17:00' }
                    ],
                    createdBy: '674c1a1b2c3d4e5f6a7b8c8a',
                    reason: 'Create attendance with lunch break'
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Attendance record created successfully',
        schema: {
            type: 'object',
            properties: {
                record: { type: 'object', description: 'Created attendance record' },
                message: { type: 'string' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid parameters' })
    async createAttendanceRecord(@Body() dto: CreateAttendanceRecordDto) {
        if (!dto.employeeId || !dto.punches || dto.punches.length === 0) {
            throw new BadRequestException('employeeId and punches array are required');
        }
        return this.attendanceService.createAttendanceRecord(dto);
    }
}
