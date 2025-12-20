import { Controller, Post, Body, Get, Param, Put, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';

import {
    RequestCorrectionDto,
    ReviewCorrectionDto,
    CorrectionType,
    StartReviewDto,
} from '../dto/AttendanceCorrectionDtos';
import { AttendanceCorrectionService } from "../services/AttendanceCorrectionService";

@ApiExtraModels(RequestCorrectionDto)
@Controller('attendance-correction')
export class AttendanceCorrectionController {
    constructor(
        private readonly correctionService: AttendanceCorrectionService,
    ) {}

    // employee submits correction request (missing punch or incorrect punch)
    @Post('request')
    @ApiOperation({ summary: 'Create an attendance correction request (missing punch or incorrect punch)' })
    @ApiBody({ schema: { $ref: getSchemaPath(RequestCorrectionDto) }, examples: {
        'MissingPunchOut': { summary: 'Missing punch out request', value: {
            employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
            attendanceRecordId: '674c1a1b2c3d4e5f6a7b8d01',
            correctionType: 'MISSING_PUNCH_OUT',
            correctedPunchDate: '10/12/2025',
            correctedPunchLocalTime: '17:00',
            reason: 'Forgot to punch out'
        } },
        'MissingPunchIn': { summary: 'Missing punch in request', value: {
            employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
            attendanceRecordId: '674c1a1b2c3d4e5f6a7b8d01',
            correctionType: 'MISSING_PUNCH_IN',
            correctedPunchDate: '10/12/2025',
            correctedPunchLocalTime: '09:00',
            reason: 'Forgot to punch in'
        } },
        'IncorrectPunchOut': { summary: 'Incorrect punch out request', value: {
            employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
            attendanceRecordId: '674c1a1b2c3d4e5f6a7b8d01',
            correctionType: 'INCORRECT_PUNCH_OUT',
            correctedPunchDate: '10/12/2025',
            correctedPunchLocalTime: '17:00',
            reason: 'Wrong timestamp recorded'
        } },
        'IncorrectPunchIn': { summary: 'Incorrect punch in request', value: {
            employeeId: '674c1a1b2c3d4e5f6a7b8c9d',
            attendanceRecordId: '674c1a1b2c3d4e5f6a7b8d01',
            correctionType: 'INCORRECT_PUNCH_IN',
            correctedPunchDate: '10/12/2025',
            correctedPunchLocalTime: '09:00',
            reason: 'Wrong timestamp recorded'
        } }
    } })
    @ApiResponse({ status: 201, description: 'Request created' })
    @ApiResponse({ status: 400, description: 'Invalid request' })
    async request(@Body() dto: RequestCorrectionDto) {
        if (!dto.attendanceRecordId) {
            throw new BadRequestException('attendanceRecordId is required');
        }

        // Require correctedPunchDate and correctedPunchLocalTime
        if (!dto.correctedPunchDate || !dto.correctedPunchLocalTime) {
            throw new BadRequestException('Provide correctedPunchDate (dd/MM/yyyy) and correctedPunchLocalTime (HH:mm)');
        }

        // Validate date/time format
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dto.correctedPunchDate)) {
            throw new BadRequestException('correctedPunchDate must be in dd/MM/yyyy format');
        }
        if (!/^\d{2}:\d{2}$/.test(dto.correctedPunchLocalTime)) {
            throw new BadRequestException('correctedPunchLocalTime must be in HH:mm format');
        }

        // Parse date/time
        const [cDay, cMonth, cYear] = dto.correctedPunchDate.split('/').map(s => parseInt(s, 10));
        const [cHour, cMinute] = dto.correctedPunchLocalTime.split(':').map(s => parseInt(s, 10));
        const ct = new Date(cYear, cMonth - 1, cDay, cHour, cMinute, 0, 0);
        if (isNaN(ct.getTime())) {
            throw new BadRequestException('Invalid corrected punch date/time');
        }
        const correctedIso = ct.toISOString();

        // Determine correction type
        const correctionType = dto.correctionType || CorrectionType.INCORRECT_PUNCH_OUT;
        const isMissingPunch = correctionType === CorrectionType.MISSING_PUNCH_IN || correctionType === CorrectionType.MISSING_PUNCH_OUT;
        const punchType = correctionType.includes('IN') ? 'IN' : 'OUT';

        // For incorrect punch corrections, validate the attendance record
        if (!isMissingPunch) {
            const check = await this.correctionService.checkPunchExists(dto.attendanceRecordId, punchType);
            if (!check.ok) {
                if (check.reason === 'ATTENDANCE_NOT_FOUND') {
                    throw new BadRequestException('Attendance record not found');
                }
                if (check.reason === 'NO_PUNCH_FOUND') {
                    return {
                        ok: false,
                        message: `No punch ${punchType} found on this attendance record. Consider using Missing Punch request.`
                    };
                }
                return { ok: false, message: 'Unable to process request' };
            }

            // Check if correction time is same as recorded time (redundant)
            if (check.same) {
                return {
                    ok: false,
                    message: `Redundant correction: entered time equals the recorded ${punchType} time`,
                    recordedTime: check.recordedTime,
                    correctedTime: correctedIso,
                };
            }
        } else {
            // For missing punch, just verify attendance record exists
            const check = await this.correctionService.checkAttendanceExists(dto.attendanceRecordId);
            if (!check.ok) {
                throw new BadRequestException('Attendance record not found');
            }
        }

        // Create correction request
        const created = await this.correctionService.requestCorrection({
            employeeId: dto.employeeId,
            attendanceRecordId: dto.attendanceRecordId,
            reason: dto.reason || `${isMissingPunch ? 'Missing' : 'Incorrect'} punch ${punchType} submitted`
        });

        // Record correction details
        await this.correctionService.recordCorrectionDetails(
            (created as any)._id?.toString() || String((created as any)._id),
            {
                type: correctionType,
                punchType: punchType,
                correctedIso,
                correctedPunchDate: dto.correctedPunchDate,
                correctedPunchLocalTime: dto.correctedPunchLocalTime,
                isMissingPunch,
            }
        );

        return {
            ok: true,
            message: `Correction request submitted successfully`,
            data: created
        };
    }

    // Manager starts reviewing (marks as IN_REVIEW)
    @Post('start-review')
    @ApiOperation({ summary: 'Mark correction as IN_REVIEW (when review button is clicked)' })
    @ApiResponse({ status: 200, description: 'Correction marked as IN_REVIEW' })
    async startReview(@Body() dto: StartReviewDto) {
        return this.correctionService.startReview(dto.correctionRequestId);
    }

    // Manager reviews (approve/reject)
    @Put('review')
    @ApiOperation({ summary: 'Review Correction Request (Approve/Reject)' })
    @ApiResponse({ status: 200, description: 'Updated correction request' })
    async review(@Body() dto: ReviewCorrectionDto) {
        return this.correctionService.reviewCorrection(dto);
    }

    // Manager sees all corrections (including history)
    @Get('all')
    @ApiOperation({ summary: 'Get all correction requests (including approved/rejected history)' })
    @ApiResponse({ status: 200, description: 'List of all correction requests' })
    async allCorrections() {
        return this.correctionService.getAllCorrections();
    }

    // Manager sees all pending
    @Get('pending')
    @ApiOperation({ summary: 'Get all pending correction requests' })
    @ApiResponse({ status: 200, description: 'List of pending corrections' })
    async pending() {
        return this.correctionService.getPendingCorrections();
    }

    // employee sees all his requests
    @Get(':employeeId')
    @ApiOperation({ summary: "Get all correction requests for an employee" })
    @ApiResponse({ status: 200, description: 'List of correction requests' })
    async employeeRequests(@Param('employeeId') id: string) {
        return this.correctionService.getEmployeeCorrections(id);
    }
}
