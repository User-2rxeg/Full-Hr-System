import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CorrectionRequestStatus } from '../models/enums';

// Correction types
export enum CorrectionType {
    MISSING_PUNCH_IN = 'MISSING_PUNCH_IN',
    MISSING_PUNCH_OUT = 'MISSING_PUNCH_OUT',
    INCORRECT_PUNCH_IN = 'INCORRECT_PUNCH_IN',
    INCORRECT_PUNCH_OUT = 'INCORRECT_PUNCH_OUT',
}

export class RequestCorrectionDto {
    @ApiProperty({ description: 'employee MongoDB ObjectId', example: '674c1a1b2c3d4e5f6a7b8c9d' })
    @IsNotEmpty()
    employeeId: string;

    @ApiProperty({ description: 'Attendance Record ID to correct (MongoDB ObjectId)', example: '674c1a1b2c3d4e5f6a7b8c9d' })
    @IsNotEmpty()
    attendanceRecordId: string;

    @ApiProperty({ description: 'Reason for the correction', example: 'Forgot to punch out' })
    @IsString()
    reason: string;

    @ApiProperty({
        description: 'Type of correction',
        enum: CorrectionType,
        example: CorrectionType.MISSING_PUNCH_OUT,
        required: false
    })
    @IsOptional()
    @IsString()
    correctionType?: CorrectionType;

    @ApiProperty({ description: 'Status of the request', example: 'SUBMITTED', required: false })
    @IsOptional()
    @IsString()
    status?: CorrectionRequestStatus;

    // For corrections: date (dd/MM/yyyy) and local time (HH:mm)
    @ApiProperty({ description: 'Corrected/Missing punch date in dd/MM/yyyy', required: false, example: '10/12/2025' })
    @IsOptional()
    @IsString()
    correctedPunchDate?: string;

    @ApiProperty({ description: 'Corrected/Missing punch local time in HH:mm', required: false, example: '17:00' })
    @IsOptional()
    @IsString()
    correctedPunchLocalTime?: string;

}

export class StartReviewDto {
    @ApiProperty({ description: 'Correction Request ID', example: '674c1a1b2c3d4e5f6a7b8d01' })
    @IsNotEmpty()
    correctionRequestId: string;
}

export class ReviewCorrectionDto {
    @ApiProperty({ description: 'Correction Request ID', example: '674c1a1b2c3d4e5f6a7b8d01' })
    @IsNotEmpty()
    correctionRequestId: string;

    @ApiProperty({ description: 'Reviewer user ID (manager)', example: '674c1a1b2c3d4e5f6a7b8c8a' })
    @IsNotEmpty()
    reviewerId: string;

    @ApiProperty({ description: 'Action to take on request', example: 'APPROVE', enum: ['APPROVE', 'REJECT'] })
    @IsNotEmpty()
    action: 'APPROVE' | 'REJECT';

    @ApiProperty({ description: 'Optional reviewer note', example: 'Approved after confirming with employee', required: false })
    @IsString()
    note?: string;
}

export class AttendanceCorrectionResponseDto {
    @ApiProperty({ description: 'Correction Request ID', example: '674c1a1b2c3d4e5f6a7b8d01' })
    _id: string;

    @ApiProperty({ description: 'employee MongoDB ObjectId', example: '674c1a1b2c3d4e5f6a7b8c9d' })
    employeeId: string;

    @ApiProperty({ description: 'Attendance Record ID', example: '674c1a1b2c3d4e5f6a7b8d02' })
    attendanceRecord: string;

    @ApiProperty({ description: 'Reason for the correction', example: 'Forgot to punch out' })
    reason?: string;

    @ApiProperty({ description: 'Current status of the correction request', enum: Object.values(CorrectionRequestStatus), example: CorrectionRequestStatus.SUBMITTED })
    status: CorrectionRequestStatus;

    @ApiProperty({ description: 'Reviewer user ID (if reviewed)', example: '674c1a1b2c3d4e5f6a7b8c8a', required: false })
    reviewerId?: string;

    @ApiProperty({ description: 'Review note (if provided)', example: 'Approved after checking', required: false })
    reviewNote?: string;

    @ApiProperty({ description: 'Creation timestamp', example: '2025-12-01T10:00:00.000Z' })
    createdAt?: Date;

    @ApiProperty({ description: 'Last update timestamp', example: '2025-12-02T12:00:00.000Z' })
    updatedAt?: Date;
}

export class AuditEventDto {
    @ApiProperty({ description: 'Event timestamp (may be null if unknown)', example: '2025-12-01T10:00:00.000Z', required: false })
    timestamp?: Date;

    @ApiProperty({ description: 'Actor ID (employee, reviewer or system)', example: '674c1a1b2c3d4e5f6a7b8c9d', required: false })
    actorId?: string;

    @ApiProperty({ description: 'Actor role (EMPLOYEE, REVIEWER, SYSTEM/NOTIFICATION)', example: 'REVIEWER', required: false })
    actorRole?: string;

    @ApiProperty({ description: 'Action taken (SUBMITTED, IN_REVIEW, APPROVED, REJECTED, NOTIFICATION)', example: 'APPROVED' })
    action: string;

    @ApiProperty({ description: 'Optional note or message associated with the event', example: 'Approved after verifying with manager', required: false })
    note?: string;
}

// export class AttendanceCorrectionAuditDto {
//     @ApiProperty({ description: 'The correction request object', type: AttendanceCorrectionResponseDto })
//     request: AttendanceCorrectionResponseDto;
//
//     @ApiProperty({ description: 'Ordered list of audit events for this correction request', type: [AuditEventDto] })
//     audit: AuditEventDto[];
// }

// export enum AttendanceRequestType {
//     MISSING_PUNCH = 'MISSING_PUNCH',
//     INCORRECT_PUNCH = 'INCORRECT_PUNCH',
//     PERMISSION = 'PERMISSION',
//     OVERTIME = 'OVERTIME',
// }

// export class AttendanceRelatedRequestDto {
//     @ApiProperty({ description: 'Type of attendance request', enum: AttendanceRequestType, example: AttendanceRequestType.MISSING_PUNCH })
//     @IsNotEmpty()
//     requestType: AttendanceRequestType;
//
//     @ApiProperty({ description: 'employee MongoDB ObjectId', example: '674c1a1b2c3d4e5f6a7b8c9d' })
//     @IsNotEmpty()
//     employeeId: string;
//
//     // For attendance correction
//     @ApiProperty({ description: 'Attendance Record ID (for correction requests only)', example: '674c1a1b2c3d4e5f6a7b8d01', required: false })
//     @IsOptional()
//     attendanceRecordId?: string;
//
//     // For permission
//     @ApiProperty({ description: 'Permission start time (ISO 8601) - for permission requests', required: false })
//     @IsOptional()
//     startTime?: string;
//
//     @ApiProperty({ description: 'Permission end time (ISO 8601) - for permission requests', required: false })
//     @IsOptional()
//     endTime?: string;
//
//     // For overtime
//     @ApiProperty({ description: 'Overtime date (YYYY-MM-DD) - for overtime requests', required: false })
//     @IsOptional()
//     date?: string;
//
//     @ApiProperty({ description: 'Overtime minutes - for overtime requests', required: false, example: 120 })
//     @IsOptional()
//     minutes?: number;
//
//     @ApiProperty({ description: 'Reason for the request', required: false, example: 'Forgot to punch out / Medical / Project deadline' })
//     @IsOptional()
//     reason?: string;
//
//     @ApiProperty({ description: 'Deadline (ISO 8601) for resolution (optional) - used by escalation', required: false })
//     @IsOptional()
//     deadline?: string;
//
//     @ApiProperty({ description: 'Corrected punch time (ISO 8601) - used for INCORRECT_PUNCH requests', required: false, example: '2025-12-10T17:00:00.000Z' })
//     @IsOptional()
//     correctedPunchTime?: string;
//
//     @ApiProperty({ description: 'Corrected punch date (dd/MM/yyyy) - user input for INCORRECT_PUNCH', required: false, example: '10/12/2025' })
//     @IsOptional()
//     correctedPunchDate?: string;
//
//     @ApiProperty({ description: 'Corrected punch local time (HH:mm) - user input for INCORRECT_PUNCH', required: false, example: '17:00' })
//     @IsOptional()
//     correctedPunchLocalTime?: string;
//
//     @ApiProperty({ description: 'Missing punch type (IN or OUT) - used for MISSING_PUNCH requests', required: false, example: 'OUT', enum: ['IN','OUT'] })
//     @IsOptional()
//     missingPunchType?: 'IN' | 'OUT';
//
//     @ApiProperty({ description: 'Missing punch date (dd/MM/yyyy) - user input for MISSING_PUNCH', required: false, example: '10/12/2025' })
//     @IsOptional()
//     missingPunchDate?: string;
//
//     @ApiProperty({ description: 'Missing punch local time (HH:mm) - user input for MISSING_PUNCH', required: false, example: '17:00' })
//     @IsOptional()
//     missingPunchLocalTime?: string;
// }

