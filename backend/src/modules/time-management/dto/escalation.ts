import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min, Max, IsOptional, IsMongoId } from 'class-validator';

export class TriggerEscalationDto {
    @ApiProperty({
        description: 'Days before payroll to send notification (0-30)',
        example: 2,
        minimum: 0,
        maximum: 30
    })
    @IsNumber()
    @Min(0)
    @Max(30)
    daysBeforePayroll: number;

    @ApiProperty({
        description: 'HR Admin user ID to send notification to',
        example: '507f1f77bcf86cd799439011'
    })
    @IsString()
    @IsMongoId()
    hrAdminId: string;

    @ApiProperty({
        description: 'Specific payroll run ID (optional - will use next payroll if not provided)',
        example: '507f1f77bcf86cd799439012',
        required: false
    })
    @IsOptional()
    @IsMongoId()
    payrollRunId?: string;
}

export class TriggerEscalationResponse {
    @ApiProperty({
        description: 'Success message',
        example: '✅ Escalation successful! 5 requests escalated to HR Admin. Notification sent.'
    })
    message: string;

    @ApiProperty({
        description: 'Number of requests escalated',
        example: 5
    })
    escalatedCount: number;

    @ApiProperty({
        description: 'Notification log ID',
        example: '507f1f77bcf86cd799439013'
    })
    notificationId: string;
}

export class GetEscalatedResponse {
    @ApiProperty({
        description: 'Total number of escalated requests',
        example: 10
    })
    totalCount: number;

    @ApiProperty({
        description: 'Escalated correction requests',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: { type: 'string', example: '507f1f77bcf86cd799439014' },
                employeeId: { type: 'string', example: '507f1f77bcf86cd799439015' },
                status: { type: 'string', example: 'SUBMITTED' },
                reason: { type: 'string', example: 'Forgot to punch out' },
                escalatedAt: { type: 'string', format: 'date-time' },
                type: { type: 'string', example: 'CORRECTION_REQUEST' }
            }
        }
    })
    correctionRequests: any[];

    @ApiProperty({
        description: 'Escalated time exceptions',
        type: 'array'
    })
    timeExceptions: any[];

    @ApiProperty({
        description: 'Escalated break permissions',
        type: 'array'
    })
    breakPermissions: any[];

    @ApiProperty({
        description: 'Last escalation date',
        type: 'string',
        format: 'date-time',
        nullable: true
    })
    lastEscalation: Date | null;
}