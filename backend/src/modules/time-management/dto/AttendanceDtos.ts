
/* ==========================
   DTOs (all in one file as requested)
   Place these classes near the service file or export them as needed.
   ========================== */

// Punch DTOs
import { PunchType } from "../models/enums";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PunchDto {
    @ApiProperty({ enum: PunchType, description: 'Type of punch (IN or OUT)' })
    type: PunchType;

    @ApiPropertyOptional({
        type: String,
        description: 'Punch time in format dd/mm/yyyy hh:mm (defaults to server time if not provided)',
        example: '01/12/2025 14:30'
    })
    time?: Date;
}

// Punch in/out DTOs
export class PunchInDto {
    @ApiProperty({
        description: 'employee ID',
        example: '692cdd8e67a40875239080d0',
        default: '692cdd8e67a40875239080d0'
    })
    employeeId: string;

    @ApiPropertyOptional({
        type: String,
        description: 'Punch in time in format dd/mm/yyyy hh:mm (optional - server time used if absent)',
        example: '01/12/2025 14:30'
    })
    time?: Date;

    @ApiPropertyOptional({
        description: 'Source of punch (device id / ip / etc)',
        example: 'web-app'
    })
    source?: string;
}

export class PunchOutDto {
    @ApiProperty({
        description: 'employee ID',
        example: '692cdd8e67a40875239080d0',
        default: '692cdd8e67a40875239080d0'
    })
    employeeId: string;

    @ApiPropertyOptional({
        type: String,
        description: 'Punch out time in format dd/mm/yyyy hh:mm (optional - server time used if absent)',
        example: '01/12/2025 18:30'
    })
    time?: Date;

    @ApiPropertyOptional({
        description: 'Source of punch (device id / ip / etc)',
        example: 'web-app'
    })
    source?: string;
}

// Update attendance record DTO
export class UpdateAttendanceRecordDto {
    punches?: PunchDto[]; // full replacement of punches array (used carefully)
    finalisedForPayroll?: boolean;
    // any other admin-provided fields
}

// Payroll export filter DTO (if needed)
export class PayrollExportDto {
    month: number; // 1-12
    year: number;
}

// Simple query DTOs
export class GetMonthlyAttendanceDto {
    employeeId: string;
    month: number;
    year: number;
}

// Attendance Review and Correction DTOs
export class ReviewAttendanceDto {
    @ApiProperty({
        description: 'Attendance Record ID to review',
        example: '674c1a1b2c3d4e5f6a7b8c9d'
    })
    attendanceRecordId: string;
}

export class CorrectAttendanceDto {
    @ApiProperty({
        description: 'Attendance Record ID to correct',
        example: '674c1a1b2c3d4e5f6a7b8c9d',
        default: '674c1a1b2c3d4e5f6a7b8c9d'
    })
    attendanceRecordId: string = '674c1a1b2c3d4e5f6a7b8c9d';

    @ApiPropertyOptional({
        description: 'Corrected punches array - Full replacement (use this OR individual add/remove operations)',
        type: [Object],
        example: [
            { type: 'IN', time: '01/12/2025 09:00' },
            { type: 'OUT', time: '01/12/2025 17:00' }
        ]
    })
    correctedPunches?: Array<{ type: PunchType; time: Date | string }>;

    @ApiPropertyOptional({
        description: 'Add missing punch IN (format: dd/mm/yyyy hh:mm)',
        type: String,
        example: '01/12/2025 09:00'
    })
    addPunchIn?: string;

    @ApiPropertyOptional({
        description: 'Add missing punch OUT (format: dd/mm/yyyy hh:mm)',
        type: String,
        example: '01/12/2025 17:00',
        default: '01/12/2025 17:00'
    })
    addPunchOut?: string = '01/12/2025 17:00';

    @ApiPropertyOptional({
        description: 'Remove punch by index (0-based)',
        type: Number,
        example: 2
    })
    removePunchIndex?: number;

    @ApiProperty({
        description: 'Reason for correction (REQUIRED - must be descriptive)',
        example: 'employee forgot to punch out',
        default: 'employee forgot to punch out'
    })
    correctionReason: string = 'employee forgot to punch out';

    @ApiPropertyOptional({
        description: 'Corrected by (admin/manager ID)',
        example: '674c1a1b2c3d4e5f6a7b8c8a',
        default: '674c1a1b2c3d4e5f6a7b8c8a'
    })
    correctedBy?: string = '674c1a1b2c3d4e5f6a7b8c8a';
}

export class BulkReviewAttendanceDto {
    @ApiProperty({
        description: 'employee ID to review attendance for',
        example: '674c1a1b2c3d4e5f6a7b8c9d',
        default: '674c1a1b2c3d4e5f6a7b8c9d'
    })
    employeeId: string = '674c1a1b2c3d4e5f6a7b8c9d';

    @ApiProperty({
        description: 'Start date for review period (format: YYYY-MM-DD)',
        example: '2025-12-01',
        default: '2025-12-01'
    })
    startDate: string = '2025-12-01';

    @ApiProperty({
        description: 'End date for review period (format: YYYY-MM-DD)',
        example: '2025-12-31',
        default: '2025-12-31'
    })
    endDate: string = '2025-12-31';

    @ApiPropertyOptional({
        description: 'Filter by issue type (ALL = show all issues)',
        enum: ['MISSING_PUNCH', 'INVALID_SEQUENCE', 'SHORT_TIME', 'ALL'],
        example: 'ALL',
        default: 'ALL'
    })
    filterByIssue?: string = 'ALL';
}

// DTO for creating attendance records manually by department heads
export class CreateAttendanceRecordDto {
    @ApiProperty({
        description: 'Employee ID',
        example: '692cdd8e67a40875239080d0'
    })
    employeeId: string;

    @ApiProperty({
        description: 'Array of punches to record (IN/OUT)',
        type: [Object],
        example: [
            { type: 'IN', time: '16/12/2025 09:00' },
            { type: 'OUT', time: '16/12/2025 17:00' }
        ]
    })
    punches: Array<{ type: PunchType; time: string | Date }>;

    @ApiPropertyOptional({
        description: 'Created by (Department Head ID)',
        example: '674c1a1b2c3d4e5f6a7b8c8a'
    })
    createdBy?: string;

    @ApiPropertyOptional({
        description: 'Reason for manual creation',
        example: 'System malfunction - manual creation for missed records'
    })
    reason?: string;
}
