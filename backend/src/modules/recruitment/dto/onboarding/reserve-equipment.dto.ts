import { IsMongoId, IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReserveEquipmentDto {
    @ApiProperty({ description: 'employee ID', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @ApiPropertyOptional({ description: 'List of equipment to reserve', example: ['Laptop', 'Monitor', 'Keyboard'] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    equipment?: string[];

    @ApiPropertyOptional({ description: 'Desk number', example: 'D-301' })
    @IsString()
    @IsOptional()
    deskNumber?: string;

    @ApiPropertyOptional({ description: 'Access card number', example: 'AC-12345' })
    @IsString()
    @IsOptional()
    accessCardNumber?: string;

    @ApiPropertyOptional({ description: 'Additional notes', example: 'Requires dual monitors for developer' })
    @IsString()
    @IsOptional()
    notes?: string;
}

