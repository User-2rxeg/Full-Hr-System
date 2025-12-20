import { ApiProperty } from '@nestjs/swagger';

export class BreakPermissionDto {
    @ApiProperty({
        description: 'Employee ID',
        example: '507f1f77bcf86cd799439011'
    })
    employeeId: string;

    @ApiProperty({
        description: 'Attendance Record ID',
        example: '507f1f77bcf86cd799439012'
    })
    attendanceRecordId: string;

    @ApiProperty({
        description: 'Break start time',
        example: '2025-12-13T12:00:00Z'
    })
    startTime: Date;

    @ApiProperty({
        description: 'Break end time',
        example: '2025-12-13T13:00:00Z'
    })
    endTime: Date;

    @ApiProperty({
        description: 'Reason for break',
        example: 'Lunch break'
    })
    reason: string;
}

export class ApproveBreakPermissionDto {
    @ApiProperty({
        description: 'ID of the manager/approver',
        example: '507f1f77bcf86cd799439011'
    })
    approvedBy: string;
}

export class RejectBreakPermissionDto {
    @ApiProperty({
        description: 'Reason for rejection',
        example: 'Not approved due to insufficient coverage'
    })
    rejectionReason: string;
}

export class PermissionLimitDto {
    @ApiProperty({
        description: 'Maximum allowed break/permission duration in minutes',
        example: 180,
    })
    maxMinutes: number;

    @ApiProperty({
        description: 'Optionally the ID of the admin/user setting the limit',
        required: false,
        example: '507f1f77bcf86cd799439011'
    })
    setBy?: string;
}
