import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProvisionAccessDto {
    @ApiProperty({ description: 'employee ID', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @ApiPropertyOptional({ description: 'Start date for access', example: '2026-01-01T00:00:00.000Z' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({ description: 'Additional notes', example: 'Grant developer access to GitHub' })
    @IsString()
    @IsOptional()
    notes?: string;
}

