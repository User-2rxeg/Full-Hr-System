import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerPayrollInitiationDto {
    @ApiProperty({ description: 'Contract ID', example: '507f1f77bcf86cd799439012' })
    @IsMongoId()
    @IsNotEmpty()
    contractId: string;

    @ApiPropertyOptional({ description: 'Additional notes', example: 'Include signing bonus in first payroll' })
    @IsString()
    @IsOptional()
    notes?: string;
}

