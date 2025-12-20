import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, IsMongoId } from 'class-validator';
import { TerminationInitiation } from '../../enums/termination-initiation.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTerminationRequestDto {
    @ApiProperty({ description: 'employee ID being terminated', example: '507f1f77bcf86cd799439011' })
    //@IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @ApiProperty({ enum: TerminationInitiation, description: 'Who initiated the termination' })
    @IsEnum(TerminationInitiation)
    @IsNotEmpty()
    initiator: TerminationInitiation;

    @ApiProperty({ description: 'Reason for termination', example: 'Performance issues' })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiPropertyOptional({ description: 'employee comments', example: 'I understand the decision' })
    @IsString()
    @IsOptional()
    employeeComments?: string;

    @ApiPropertyOptional({ description: 'HR comments', example: 'All procedures followed' })
    @IsString()
    @IsOptional()
    hrComments?: string;

    @ApiPropertyOptional({ description: 'Termination effective date', example: '2025-12-31T00:00:00.000Z' })
    @IsDateString()
    @IsOptional()
    terminationDate?: string;

    @ApiProperty({ description: 'Contract ID associated with the employee', example: '507f1f77bcf86cd799439011' })
    //@IsMongoId()
    @IsNotEmpty()
    contractId: string;
}
