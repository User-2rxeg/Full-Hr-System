// src/time-management/dto/time-exception.dtos.ts
import { IsNotEmpty, IsOptional, IsEnum, IsString } from 'class-validator';
import { TimeExceptionType, TimeExceptionStatus } from '../models/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExceptionDto {
    @IsNotEmpty()
    @ApiProperty({ description: 'employee id (string)', example: '674c1a1b2c3d4e5f6a7b8c9d' })
    employeeId!: string;

    @IsNotEmpty()
    @ApiProperty({ description: 'Related attendance record id', example: '674c1a1b2c3d4e5f6a7b8d01' })
    attendanceRecordId!: string;

    @IsEnum(TimeExceptionType)
    @ApiProperty({ description: 'Type of the time exception', enum: TimeExceptionType, example: TimeExceptionType.MISSED_PUNCH })
    type!: TimeExceptionType;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Optional reason for the exception', example: 'Forgot to punch out' })
    reason?: string;

    // optional initial assignee
    @IsOptional()
    @ApiPropertyOptional({ description: 'Optional id of the initially assigned approver', example: '674c1a1b2c3d4e5f6a7b8e02' })
    assignedTo?: string;
}

export class AssignExceptionDto {
    @IsNotEmpty()
    exceptionId!: string;

    @IsNotEmpty()
    assigneeId!: string;
}

export class UpdateExceptionStatusDto {
    @IsNotEmpty()
    exceptionId!: string;

    @IsEnum(TimeExceptionStatus)
    status!: TimeExceptionStatus;

    @IsOptional()
    @IsString()
    comment?: string;
}

export class ExceptionQueryDto {
    @IsOptional()
    status?: TimeExceptionStatus;

    @IsOptional()
    type?: TimeExceptionType;

    @IsOptional()
    employeeId?: string;

    @IsOptional()
    assignedTo?: string;
}
