import { IsNotEmpty, IsString, IsDateString, IsMongoId, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResignationRequestDto {
    @ApiProperty({ description: 'employee ID submitting resignation', example: '507f1f77bcf86cd799439011' })
    //@IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @ApiProperty({ description: 'Reason for resignation', example: 'Better opportunity' })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiPropertyOptional({ description: 'employee comments', example: 'Thank you for the opportunity' })
    @IsString()
    @IsOptional()
    employeeComments?: string;

    @ApiPropertyOptional({ description: 'Resignation effective date', example: '2025-12-31T00:00:00.000Z' })
    @IsDateString()
    @IsOptional()
    terminationDate?: string;

    @ApiProperty({ description: 'Contract ID associated with the employee', example: '507f1f77bcf86cd799439011' })
    //@IsMongoId()
    @IsNotEmpty()
    contractId: string;
}

