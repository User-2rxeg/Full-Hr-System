import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TerminationStatus } from '../../enums/termination-status.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTerminationStatusDto {
    @ApiProperty({ enum: TerminationStatus, description: 'New termination status' })
    @IsEnum(TerminationStatus)
    status: TerminationStatus;

    @ApiPropertyOptional({ description: 'HR comments on status update', example: 'Approved by management' })
    @IsString()
    @IsOptional()
    hrComments?: string;
}


// Maybe put comments from both hr and employee, termination reason here in update termination dto