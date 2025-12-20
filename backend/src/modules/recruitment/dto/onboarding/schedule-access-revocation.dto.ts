import { IsMongoId, IsNotEmpty, IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleAccessRevocationDto {
    @ApiProperty({ description: 'employee ID', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @ApiPropertyOptional({ description: 'Scheduled revocation date', example: '2026-12-31T23:59:59.000Z' })
    @IsDateString()
    @IsOptional()
    revocationDate?: string;

    @ApiPropertyOptional({ description: 'Notes', example: 'Auto-revoke on last working day' })
    @IsString()
    @IsOptional()
    notes?: string;
}

