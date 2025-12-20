import {Controller, Get, Post, Patch, Body, Param, Delete, Query, UseGuards} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiBearerAuth} from '@nestjs/swagger';
import {
    AssignShiftDto, CreateHolidayDto, CreateLatenessRuleDto, CreateOvertimeRuleDto,
    CreateScheduleRuleDto,
    CreateShiftDto,
    CreateShiftTypeDto, RenewAssignmentDto, UpdateHolidayDto,
    UpdateOvertimeRuleDto, UpdateScheduleRuleDto,
    UpdateShiftDto,
    UpdateShiftTypeDto,
    UpdateShiftAssignmentStatusDto, CreateShortTimeRuleDto, UpdateShortTimeRuleDto, UpdateLatenessRuleDto
} from "../dto/ShiftManagementDtos";
import {ShiftManagementService} from "../services/ShiftManagementService";
import { RepeatedLatenessService } from '../services/RepeatedLatenessService';
import { RepeatedLatenessEvaluateRequestDto, RepeatedLatenessEvaluateResponseDto } from '../dto/ShiftManagementDtos';
import {AuthenticationGuard} from "../../auth/guards/authentication-guard";
import {AuthorizationGuard} from "../../auth/guards/authorization-guard";
import {Roles} from "../../auth/decorators/roles-decorator";
import {SystemRole} from "../../employee/enums/employee-profile.enums";

@ApiTags('Shift Management')
@Controller('time-management')
export class ShiftManagementController {
    constructor(
        private readonly service: ShiftManagementService,
        private readonly repeatedLatenessService: RepeatedLatenessService,
    ) {}


    ////////////////////////////////////////SHIFT TYPES/////////////////////////////////

    @Post('shift-types')
    @UseGuards(AuthenticationGuard,AuthorizationGuard)
    @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Create ShiftType',
        description: 'HR Manager/Admin defines standardized shift configurations'
    })
    @ApiBody({
        type: CreateShiftTypeDto,
        examples: {
            'Example 1': {
                value: {
                    name: 'Morning Shift',
                    active: true
                }
            },
            'Example 2': {
                value: {
                    name: 'Night Shift',
                    active: true
                }
            }
        }
    })
    @ApiResponse({ status: 201, description: 'Shift type created successfully' })
    @ApiResponse({ status: 409, description: 'Shift type already exists' })
    createShiftType(@Body() dto: CreateShiftTypeDto) {
        return this.service.createShiftType(dto);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    @Get('shift-types')
    @ApiOperation({ summary: 'Get All Shift Types' })
    @ApiResponse({ status: 200, description: 'List of shift types' })
    getShiftTypes() {
        return this.service.getShiftTypes();
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    @Patch('shift-types/:id')
    @UseGuards(AuthenticationGuard,AuthorizationGuard)
    @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Update ShiftType' })
    @ApiParam({ name: 'id', description: 'ShiftType ID' })
    @ApiBody({ type: UpdateShiftTypeDto })
    @ApiResponse({ status: 200, description: 'Shift type updated' })
    @ApiResponse({ status: 404, description: 'Shift type not found' })
    updateShiftType(@Param('id') id: string, @Body() dto: UpdateShiftTypeDto) {
        return this.service.updateShiftType(id, dto);
    }

    //////////////////////////////////////////////////////////////////


    @Delete('shift-types/:id')
    @UseGuards(AuthenticationGuard,AuthorizationGuard)
    @Roles(SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Deactivate ShiftType' })
    @ApiParam({ name: 'id', description: 'ShiftType ID' })
    @ApiResponse({ status: 200, description: 'Shift type deactivated' })
    @ApiResponse({ status: 404, description: 'Shift type not found' })
    deactivateShiftType(@Param('id') id: string) {
        return this.service.deactivateShiftType(id);
    }


    //////////////////////////////////////SHIFTS/////////////////////////////////

    // Shifts
    @Post('shifts')
    @ApiOperation({
        summary: 'Create Shift',
        description: 'Create a new shift with specific time range, punch policy, and grace periods. Default example shows a standard morning shift with FIRST_LAST policy.'
    })
    @ApiBody({
        type: CreateShiftDto,
        description: 'Shift configuration with default values pre-filled',
        examples: {
            'Morning Shift (FIRST_LAST - Default)': {
                summary: 'Standard morning shift 9-5 with FIRST_LAST policy',
                description: 'Records only first IN and last OUT punches',
                value: {
                    name: 'Morning Shift 9-5',
                    shiftType: '674c1a1b2c3d4e5f6a7b8c9d',
                    startTime: '09:00',
                    endTime: '17:00',
                    punchPolicy: 'FIRST_LAST',
                    graceInMinutes: 15,
                    graceOutMinutes: 30,
                    requiresApprovalForOvertime: false,
                    active: true
                }
            },
            'Afternoon Shift (FIRST_LAST)': {
                summary: 'Afternoon shift 1-9 PM',
                description: 'Standard afternoon shift with FIRST_LAST policy',
                value: {
                    name: 'Afternoon Shift 1-9',
                    shiftType: '674c1a1b2c3d4e5f6a7b8c9d',
                    startTime: '13:00',
                    endTime: '21:00',
                    punchPolicy: 'FIRST_LAST',
                    graceInMinutes: 10,
                    graceOutMinutes: 20,
                    requiresApprovalForOvertime: false,
                    active: true
                }
            },
            'Night Shift (FIRST_LAST)': {
                summary: 'Night shift 10 PM - 6 AM',
                description: 'Overnight shift crossing midnight',
                value: {
                    name: 'Night Shift 10-6',
                    shiftType: '674c1a1b2c3d4e5f6a7b8c9d',
                    startTime: '22:00',
                    endTime: '06:00',
                    punchPolicy: 'FIRST_LAST',
                    graceInMinutes: 15,
                    graceOutMinutes: 15,
                    requiresApprovalForOvertime: true,
                    active: true
                }
            },
            'Flexible Hours (MULTIPLE)': {
                summary: 'Flexible schedule with multiple punch tracking',
                description: 'Records all IN/OUT punches for break tracking',
                value: {
                    name: 'Flexible Hours',
                    shiftType: '674c1a1b2c3d4e5f6a7b8c9d',
                    startTime: '09:00',
                    endTime: '17:00',
                    punchPolicy: 'MULTIPLE',
                    graceInMinutes: 15,
                    graceOutMinutes: 30,
                    requiresApprovalForOvertime: false,
                    active: true
                }
            },
            'Part-Time Shift (FIRST_LAST)': {
                summary: 'Part-time 4-hour shift',
                description: 'Short shift for part-time employees',
                value: {
                    name: 'Part-Time 9-1',
                    shiftType: '674c1a1b2c3d4e5f6a7b8c9d',
                    startTime: '09:00',
                    endTime: '13:00',
                    punchPolicy: 'FIRST_LAST',
                    graceInMinutes: 10,
                    graceOutMinutes: 10,
                    requiresApprovalForOvertime: false,
                    active: true
                }
            },
            'Split Shift (MULTIPLE)': {
                summary: 'Split shift with break tracking',
                description: 'Flexible shift requiring all punch tracking',
                value: {
                    name: 'Split Shift',
                    shiftType: '674c1a1b2c3d4e5f6a7b8c9d',
                    startTime: '08:00',
                    endTime: '18:00',
                    punchPolicy: 'MULTIPLE',
                    graceInMinutes: 20,
                    graceOutMinutes: 20,
                    requiresApprovalForOvertime: false,
                    active: true
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Shift created successfully',
        schema: {
            type: 'object',
            properties: {
                _id: { type: 'string', example: '674c1a1b2c3d4e5f6a7b8c9d' },
                name: { type: 'string', example: 'Morning Shift 9-5' },
                shiftType: { type: 'string', example: '674c1a1b2c3d4e5f6a7b8c9d' },
                startTime: { type: 'string', example: '09:00' },
                endTime: { type: 'string', example: '17:00' },
                punchPolicy: { type: 'string', example: 'FIRST_LAST' },
                graceInMinutes: { type: 'number', example: 15 },
                graceOutMinutes: { type: 'number', example: 30 },
                requiresApprovalForOvertime: { type: 'boolean', example: false },
                active: { type: 'boolean', example: true }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid shift configuration' })
    @ApiResponse({ status: 404, description: 'Shift type not found' })
    createShift(@Body() dto: CreateShiftDto) {
        return this.service.createShift(dto);
    }

    //////////////////////////////////////////////////////////////////////


    @Get('shifts')
    getShifts(@Query() filter: any) {
        return this.service.getShifts(filter);
    }


    //////////////////////////////////////////////////////////////////////


    @Patch('shifts/:id')
    updateShift(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
        return this.service.updateShift(id, dto);
    }

    //////////////////////////////////////////////////////////////////////


    @Delete('shifts/:id')
    deactivateShift(@Param('id') id: string) {
        return this.service.deactivateShift(id);
    }


    //////////////////////////////////////SCHEDULE RULES/////////////////////////////////


    // Schedule Rules
    @Post('schedule-rules')
    @UseGuards(AuthenticationGuard,AuthorizationGuard)
    @Roles(SystemRole.HR_MANAGER)
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Create Schedule Rule',
        description: 'HR Manager/Admin creates a scheduling rule with a specific pattern (e.g., weekly, daily, or custom patterns)'
    })
    @ApiBody({
        type: CreateScheduleRuleDto,
        examples: {
            'Weekly Office Hours': {
                value: {
                    name: 'Weekly Office Hours',
                    pattern: 'WEEKLY:Mon,Tue,Wed,Thu,Fri',
                    active: true
                }
            },
            'Daily Morning Shift': {
                value: {
                    name: 'Daily Morning Shift',
                    pattern: 'DAILY:09:00-17:00',
                    active: true
                }
            },
            'Weekend Schedule': {
                value: {
                    name: 'Weekend Only',
                    pattern: 'WEEKLY:Sat,Sun',
                    active: false
                }
            },
            'Rotating Shift': {
                value: {
                    name: 'Rotating 3-2 Schedule',
                    pattern: 'ROTATION:3days-on-2days-off',
                    active: true
                }
            }
        }
    })
    @ApiResponse({ status: 201, description: 'Schedule rule created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid request data' })
    @ApiResponse({ status: 409, description: 'Schedule rule already exists' })
    createScheduleRule(@Body() dto: CreateScheduleRuleDto) {
        return this.service.createScheduleRule(dto);
    }
///////////////////////////////////////////////////////////////////////


    @Get('schedule-rules')
    @ApiOperation({
        summary: 'Get All Schedule Rules',
        description: 'Retrieve all schedule rules in the system'
    })
    @ApiResponse({ status: 200, description: 'List of schedule rules' })
    getScheduleRules() {
        return this.service.getScheduleRules();
    }


///////////////////////////////////////////////////////////////////////


    @Patch('schedule-rules/:id')
    @UseGuards(AuthenticationGuard,AuthorizationGuard)
    @Roles(SystemRole.HR_MANAGER)
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Update Schedule Rule',
        description: 'Update an existing schedule rule by ID'
    })
    @ApiParam({ name: 'id', description: 'Schedule Rule ID (MongoDB ObjectId)' })
    @ApiBody({ type: UpdateScheduleRuleDto })
    @ApiResponse({ status: 200, description: 'Schedule rule updated successfully' })
    @ApiResponse({ status: 404, description: 'Schedule rule not found' })
    updateScheduleRule(@Param('id') id: string, @Body() dto: UpdateScheduleRuleDto) {
        return this.service.updateScheduleRule(id, dto);
    }


///////////////////////////////////////////////////////////////////////////////

    @Delete('schedule-rules/:id')
    @UseGuards(AuthenticationGuard,AuthorizationGuard)
    @Roles(SystemRole.HR_MANAGER)
    @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Deactivate Schedule Rule',
        description: 'Deactivate a schedule rule by ID'
    })
    @ApiParam({ name: 'id', description: 'Schedule Rule ID (MongoDB ObjectId)' })
    @ApiResponse({ status: 200, description: 'Schedule rule deactivated successfully' })
    @ApiResponse({ status: 404, description: 'Schedule rule not found' })
    deactivateScheduleRule(@Param('id') id: string) {
        return this.service.deactivateScheduleRule(id);
    }


////////////////////////////////SHIFT ASSIGNMENTS/////////////////////////////////

    //Shift Assignments
    @Post('assignments')
    // @UseGuards(AuthenticationGuard,AuthorizationGuard)
    // @Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    // @ApiBearerAuth('access-token')
    @ApiOperation({
        summary: 'Assign Shift (Individual, Department, or Position)',
        description: 'HR Manager/Admin assigns a shift to an employee, all employees in a department, or all employees in a position. At least one target (employeeId, departmentId, or positionId) must be provided.'
    })
    @ApiBody({
        type: AssignShiftDto,
        description: 'Shift assignment data. Provide ONE of: employeeId (individual), departmentId (all in dept), or positionId (all in position).',
        examples: {
            'Assign to Individual Employee': {
                summary: 'Assign shift to a specific employee',
                value: {
                    employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
                    shiftId: '674c1a1b2c3d4e5f6a7b8d01',
                    startDate: '2025-12-01T00:00:00.000Z',
                    endDate: '2026-12-31T23:59:59.000Z',
                    scheduleRuleId: '6932fd2227fcf7d270695536',
                    status: 'APPROVED'
                }
            },
            'Assign to Department': {
                summary: 'Assign shift to all employees in a department',
                value: {
                    departmentId: '674c1a1b2c3d4e5f6a7b8c8a',
                    shiftId: '674c1a1b2c3d4e5f6a7b8d01',
                    startDate: '2025-12-01T00:00:00.000Z',
                    endDate: '2026-12-31T23:59:59.000Z',
                    scheduleRuleId: '6932fd2227fcf7d270695536',
                    status: 'APPROVED'
                }
            },
            'Assign to Position': {
                summary: 'Assign shift to all employees with a specific position',
                value: {
                    positionId: '674c1a1b2c3d4e5f6a7b8c8b',
                    shiftId: '674c1a1b2c3d4e5f6a7b8d01',
                    startDate: '2025-12-01T00:00:00.000Z',
                    endDate: '2026-12-31T23:59:59.000Z',
                    scheduleRuleId: '6932fd2227fcf7d270695536',
                    status: 'APPROVED'
                }
            },
            // 'With Schedule Rule': {
            //     summary: 'Assign shift with rotating schedule',
            //     value: {
            //         employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
            //         shiftId: '674c1a1b2c3d4e5f6a7b8d01',
            //         scheduleRuleId: '674c1a1b2c3d4e5f6a7b8d02',
            //         startDate: '2025-12-01T00:00:00.000Z',
            //         endDate: '2026-12-31T23:59:59.000Z',
            //         status: 'APPROVED',
            //         createdBy: '674c1a1b2c3d4e5f6a7b8d03'
            //     }
            // },
            'Permanent Assignment': {
                summary: 'Assign shift permanently (no end date)',
                value: {
                    employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
                    shiftId: '674c1a1b2c3d4e5f6a7b8d01',
                    startDate: '2025-12-01T00:00:00.000Z',
                    status: 'APPROVED'
                }
            },
            'Pending Assignment': {
                summary: 'Create assignment that requires approval',
                value: {
                    employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
                    shiftId: '674c1a1b2c3d4e5f6a7b8d01',
                    startDate: '2025-12-01T00:00:00.000Z',
                    endDate: '2026-01-31T23:59:59.000Z',
                    status: 'PENDING'
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Shift assignment(s) created successfully',
        schema: {
            example: {
                message: 'Shift assignment created successfully',
                assignmentId: '674c1a1b2c3d4e5f6a7b8d10',
                employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
                scheduleRuleId: '6932fd2227fcf7d270695536',
                shiftId: '674c1a1b2c3d4e5f6a7b8d01'
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid data or missing required fields',
        schema: {
            example: {
                statusCode: 400,
                message: 'At least one target (employeeId, departmentId, or positionId) must be provided',
                error: 'Bad Request'
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Shift, employee, department, or position not found',
        schema: {
            example: {
                statusCode: 404,
                message: 'Shift with ID 674c1a1b2c3d4e5f6a7b8d01 not found',
                error: 'Not Found'
            }
        }
    })
    async assignShift(@Body() dto: AssignShiftDto) {
        try {
            const result = await this.service.assignShiftToEmployee(dto);
            return {
                message: 'Shift assignment created successfully',
                data: result
            };
        } catch (error: any) {
            console.error('❌ Controller caught error:', error?.message || error);
            throw error;
        }
    }
    ////////////////////////////////////////////////////////////////////////////
    @Get('assignments')
    @ApiOperation({
        summary: 'Get All Shift Assignments',
        description: 'Retrieve all shift assignments in the system (for HR Admin dashboard)'
    })
    @ApiResponse({
        status: 200,
        description: 'List of all shift assignments',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    _id: { type: 'string' },
                    employeeId: { type: 'string' },
                    departmentId: { type: 'string' },
                    positionId: { type: 'string' },
                    shiftId: { type: 'string' },
                    scheduleRuleId: { type: 'string' },
                    startDate: { type: 'string' },
                    endDate: { type: 'string' },
                    status: { type: 'string' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' }
                }
            }
        }
    })
    async getAllAssignments() {
        return this.service.getAllAssignments();
    }

    ////////////////////////////////////////////////////////////////////////////

    @Get('assignments/employee/:employeeId')
    getAssignmentsForEmployee(@Param('employeeId') employeeId: string) {
        return this.service.getAssignmentsForEmployee(employeeId);
    }

    /////////////////////////////////////////////////////////////////////////////////

    @Patch('assignments/:id')
    renewAssignment(@Param('id') id: string, @Body() dto: RenewAssignmentDto) {
        return this.service.renewAssignment(id, dto);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////

    @Delete('assignments/:id')
    expireAssignment(@Param('id') id: string) {
        return this.service.expireAssignment(id);
    }
//////////////////////////////////////////////////////////////////////////////////////////

    @Patch('assignments/:id/status')
    @ApiOperation({
        summary: 'Update Shift Assignment Status',
        description: 'HR Manager/Admin updates the status of a shift assignment. Status can be PENDING, APPROVED, CANCELLED, or EXPIRED.'
    })
    @ApiParam({
        name: 'id',
        description: 'Shift Assignment ID (MongoDB ObjectId)',
        example: '674c1a1b2c3d4e5f6a7b8d10'
    })
    @ApiBody({
        type: UpdateShiftAssignmentStatusDto,
        description: 'Status update data',
        examples: {
            'Approve Assignment': {
                summary: 'Approve a pending shift assignment',
                value: {
                    status: 'APPROVED',
                    reason: 'Approved by HR Manager after verification',
                    updatedBy: '674c1a1b2c3d4e5f6a7b8d03'
                }
            },
            'Cancel Assignment': {
                summary: 'Cancel a shift assignment',
                value: {
                    status: 'CANCELLED',
                    reason: 'employee requested shift change',
                    updatedBy: '674c1a1b2c3d4e5f6a7b8d03'
                }
            },
            'Mark as Expired': {
                summary: 'Mark assignment as expired',
                value: {
                    status: 'EXPIRED',
                    reason: 'Assignment period has ended'
                }
            },
            'Set to Pending': {
                summary: 'Set status back to pending for review',
                value: {
                    status: 'PENDING',
                    reason: 'Requires additional approval'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Shift assignment status updated successfully',
        schema: {
            example: {
                message: 'Shift assignment status updated successfully',
                assignmentId: '674c1a1b2c3d4e5f6a7b8d10',
                oldStatus: 'PENDING',
                newStatus: 'APPROVED',
                updatedAt: '2025-12-01T10:30:00.000Z'
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid status value',
        schema: {
            example: {
                statusCode: 400,
                message: 'Invalid status. Must be one of: PENDING, APPROVED, CANCELLED, EXPIRED',
                error: 'Bad Request'
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Shift assignment not found',
        schema: {
            example: {
                statusCode: 404,
                message: 'Shift assignment with ID 674c1a1b2c3d4e5f6a7b8d10 not found',
                error: 'Not Found'
            }
        }
    })
    updateAssignmentStatus(
        @Param('id') id: string,
        @Body() dto: UpdateShiftAssignmentStatusDto
    ) {
        return this.service.updateAssignmentStatus(id, dto);
    }
/////////////////////////////HOLIDAYS/////////////////////////////////


    // Holidays
    @Post('holidays')
    createHoliday(@Body() dto: CreateHolidayDto) {
        return this.service.createHoliday(dto);
    }
////////////////////////////////////////////////////////////////////////////////


    @Get('holidays')
    getHolidays(@Query() filter: any) {
        return this.service.getHolidays(filter);
    }

    ///////////////////////////////////////////////////////////////////////


    @Patch('holidays/:id')
    updateHoliday(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
        return this.service.updateHoliday(id, dto);
    }

    ///////////////////////////////////////////////////////////////////////

    @Delete('holidays/:id')
    deactivateHoliday(@Param('id') id: string) {
        return this.service.deactivateHoliday(id);
    }

    //////////////////////////////LATENESS RULES/////////////////////////////////////////

    // Lateness Rules
    // @UseGuards(AuthenticationGuard,AuthorizationGuard)
    // @Roles(SystemRole.HR_MANAGER)
    // @ApiBearerAuth('access-token')
    @Post('lateness-rules')
    @ApiOperation({ summary: 'Create Lateness Rule', description: 'HR Manager/Admin defines lateness policy (grace period and deductions)' })
    @ApiBody({
        type: CreateLatenessRuleDto,
        examples: {
            'Standard Lateness': {
                summary: 'Standard policy with 15 minutes grace and 0.5 deduction per minute',
                value: {
                    name: 'Standard Lateness Policy',
                    description: 'Late arrivals greater than grace period are marked and may have payroll deductions',
                    gracePeriodMinutes: 15,
                    deductionForEachMinute: 0.5,
                    active: true
                }
            },
            'Strict Lateness': {
                summary: 'Strict policy with no grace and higher deduction',
                value: {
                    name: 'Strict Lateness Policy',
                    description: 'No grace allowed; deduction applied for each minute late',
                    gracePeriodMinutes: 0,
                    deductionForEachMinute: 1.0,
                    active: true
                }
            }
        }
    })
    createLatenessRule(@Body() dto: CreateLatenessRuleDto) {
        return this.service.createLatenessRule(dto);
    }

    ///////////////////////////////////////////////////////////////////////

    @Get('lateness-rules')
    @ApiOperation({ summary: 'Get Lateness Rules' })
    @ApiResponse({ status: 200, description: 'List of lateness rules' })
    getLatenessRules() {
        return this.service.getLatenessRules();
    }

    ///////////////////////////////////////////////////////////////////////

    @Patch('lateness-rules/:id')
    @ApiOperation({ summary: 'Update Lateness Rule' })
    @ApiParam({ name: 'id', description: 'Lateness Rule ID' })
    @ApiBody({ type: UpdateLatenessRuleDto })
    updateLatenessRule(@Param('id') id: string, @Body() dto: UpdateLatenessRuleDto) {
        return this.service.updateLatenessRule(id, dto);
    }

    ///////////////////////////////////////////////////////////////////////


    // Repeated lateness utilities
    @Get('repeated-lateness/:employeeId/count')
    @ApiOperation({ summary: 'Get repeated lateness count for an employee', description: 'Returns number of LATE exceptions (total, not limited to a window).' })
    @ApiParam({ name: 'employeeId', description: 'employee ID (ObjectId)' })
    @ApiResponse({ status: 200, description: 'Total count of LATE exceptions for the employee', schema: { type: 'integer', example: 4 } })
    getRepeatedLatenessCount(@Param('employeeId') employeeId: string) {
        return this.repeatedLatenessService.getLateCount(employeeId);
    }

    ///////////////////////////////////////////////////////////////////////


    @Post('repeated-lateness/:employeeId/evaluate')
    @ApiOperation({ summary: 'Evaluate and escalate repeated lateness for an employee', description: 'Manually trigger repeated-lateness evaluation and escalation (creates escalation exception & notification when threshold met).' })
    @ApiParam({ name: 'employeeId', description: 'employee ID (ObjectId)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                windowDays: { type: 'integer', description: 'Number of days in the rolling window to evaluate', example: 90 },
                threshold: { type: 'integer', description: 'Threshold number of late occurrences that triggers escalation', example: 3 },
                notifyHrId: { type: 'string', description: 'Optional HR/User ObjectId to notify', example: '693308bb32822777ec0e2411' }
            },
            additionalProperties: false,
            example: {
                windowDays: 30,
                threshold: 3,
                notifyHrId: '674c1a1b2c3d4e5f6a7b8d03'
            }
        },
        examples: {
            DefaultEvaluate: {
                summary: 'Trigger evaluation with system defaults (empty body)',
                value: {}
            },
            CustomWindowAndNotify: {
                summary: 'Custom windowDays and notify specific HR user',
                value: { windowDays: 30, threshold: 3, notifyHrId: '693308bb32822777ec0e2411' }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Evaluation completed', type: RepeatedLatenessEvaluateResponseDto })
    evaluateRepeatedLateness(@Param('employeeId') employeeId: string, @Body() body?: RepeatedLatenessEvaluateRequestDto) {
        return this.repeatedLatenessService.evaluateAndEscalateIfNeeded(employeeId, {
            windowDays: body?.windowDays,
            threshold: body?.threshold,
            notifyHrId: body?.notifyHrId,
        });
    }

    //////////////////////////////OVERTIME & SHORT-TIME RULES/////////////////////////////////////////


    // Overtime Rules
    // @UseGuards(AuthenticationGuard,AuthorizationGuard)
    // @Roles(SystemRole.HR_MANAGER)
    // @ApiBearerAuth('access-token')
    @Post('overtime-rules')
    @ApiOperation({ summary: 'Create Overtime Rule', description: 'HR Manager/Admin creates an overtime rule which may include weekend/holiday handling and approval requirements' })
    @ApiBody({
        type: CreateOvertimeRuleDto,
        examples: {
            'Standard Overtime': {
                summary: 'Standard overtime policy with 1.5x rate and admin approval required for weekend/holiday',
                value: {
                    name: 'Standard Overtime Policy',
                    description: 'Overtime paid at 1.5x after 8 hours/day. Weekend and holiday overtime require manager approval.',
                    active: true,
                    approved: false
                }
            },
            'Holiday and Weekend OT': {
                summary: 'A rule focusing on weekend and holiday overtime handling',
                value: {
                    name: 'Weekend/Holiday Overtime',
                    description: 'Weekend and holiday overtime paid at 2x. Requires pre-approval for weekend work.',
                    active: true,
                    approved: false
                }
            },
            'Disabled Rule Example': {
                summary: 'Example of an inactive overtime rule',
                value: {
                    name: 'Legacy OT Rule',
                    description: 'Legacy rule kept for reference',
                    active: false,
                    approved: true
                }
            }
        }
    })
    createOvertimeRule(@Body() dto: CreateOvertimeRuleDto) {
        return this.service.createOvertimeRule(dto);
    }

    ///////////////////////////////////////////////////////////////////////

    @Get('overtime-rules')
    @ApiOperation({ summary: 'Get All Overtime Rules' })
    @ApiResponse({ status: 200, description: 'List of overtime rules' })
    getOvertimeRules() {
        return this.service.getOvertimeRules();
    }

    ///////////////////////////////////////////////////////////////////////


    // @UseGuards(AuthenticationGuard,AuthorizationGuard)
    // @Roles(SystemRole.HR_MANAGER)
    // @ApiBearerAuth('access-token')
    @Patch('overtime-rules/:id')
    updateOvertimeRule(@Param('id') id: string, @Body() dto: UpdateOvertimeRuleDto) {
        return this.service.updateOvertimeRule(id, dto);
    }

    ///////////////////////////////////////////////////////////////////////

    @Post('overtime-rules/:id/approve')
    approveOvertime(@Param('id') id: string) {
        return this.service.approveOvertimeRule(id);
    }

    //////////////////////////////SHORT-TIME RULES/////////////////////////////////////////


    // Short-time Rules
    // @UseGuards(AuthenticationGuard,AuthorizationGuard)
    // @Roles(SystemRole.HR_MANAGER)
    // @ApiBearerAuth('access-token')
    @Post('short-time-rules')
    @ApiOperation({ summary: 'Create Short-time Rule', description: 'HR Manager/Admin creates a short-time rule (weekday/weekend/holiday handling and pre-approval settings)' })
    @ApiBody({
        type: CreateShortTimeRuleDto,
        examples: {
            'Standard Short Time': {
                summary: 'Short time threshold 30 minutes, ignore holidays',
                value: {
                    name: 'Standard Short Time Policy',
                    description: 'Detect short time when worked 30+ minutes less than scheduled; ignore holidays.',
                    requiresPreApproval: false,
                    ignoreWeekends: false,
                    ignoreHolidays: true,
                    minShortMinutes: 30,
                    active: true,
                    approved: false
                }
            },
            'Strict Short Time': {
                summary: 'Requires pre-approval and applies on weekends',
                value: {
                    name: 'Strict Short Time Policy',
                    description: 'Short time flagged for any 15+ minutes difference; weekends included and require pre-approval.',
                    requiresPreApproval: true,
                    ignoreWeekends: false,
                    ignoreHolidays: false,
                    minShortMinutes: 15,
                    active: true,
                    approved: false
                }
            }
        }
    })
    createShortTimeRule(@Body() dto: CreateShortTimeRuleDto) {
        return this.service.createShortTimeRule(dto);
    }

    ///////////////////////////////////////////////////////////////////////


    @Get('short-time-rules')
    @ApiOperation({ summary: 'Get Short-time Rules' })
    @ApiResponse({ status: 200, description: 'List of short-time rules' })
    getShortTimeRules() {
        return this.service.getShortTimeRules();
    }

    ///////////////////////////////////////////////////////////////////////


    // @UseGuards(AuthenticationGuard,AuthorizationGuard)
    // @Roles(SystemRole.HR_MANAGER)
    // @ApiBearerAuth('access-token')
    @Patch('short-time-rules/:id')
    @ApiOperation({ summary: 'Update Short-time Rule' })
    @ApiParam({ name: 'id', description: 'Short-time Rule ID' })
    @ApiBody({ type: UpdateShortTimeRuleDto })
    updateShortTimeRule(@Param('id') id: string, @Body() dto: UpdateShortTimeRuleDto) {
        return this.service.updateShortTimeRule(id, dto);
    }

    ///////////////////////////////////////////////////////////////////////


    @Post('short-time-rules/:id/approve')
    @ApiOperation({ summary: 'Approve Short-time Rule' })
    @ApiParam({ name: 'id', description: 'Short-time Rule ID' })
    approveShortTime(@Param('id') id: string) {
        return this.service.approveShortTimeRule(id);
    }

}
