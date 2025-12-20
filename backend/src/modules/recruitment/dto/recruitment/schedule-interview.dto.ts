import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsMongoId, IsOptional, IsDateString, IsArray, IsEnum } from 'class-validator';
import { InterviewMethod } from '../../enums/interview-method.enum';
import { InterviewStatus } from '../../enums/interview-status.enum';
import { ApplicationStage } from '../../enums/application-stage.enum';

/**
 * REC-010: Schedule and manage interview invitations
 * REC-021: Coordinate interview panels (members, availability, scoring)
 * Recruiters must be able to schedule interviews by selecting time slots, panel members, and modes
 */
export class ScheduleInterviewDto {
    @ApiProperty({ description: 'Application ID', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsNotEmpty()
    applicationId: string;

    @ApiProperty({ description: 'Interview stage', enum: ApplicationStage })
    @IsEnum(ApplicationStage)
    @IsNotEmpty()
    stage: ApplicationStage;

    @ApiProperty({ description: 'Scheduled date and time', example: '2025-12-15T10:00:00Z' })
    @IsDateString()
    @IsNotEmpty()
    scheduledDate: string;

    @ApiProperty({ description: 'Interview method', enum: InterviewMethod })
    @IsEnum(InterviewMethod)
    @IsNotEmpty()
    method: InterviewMethod;

    @ApiProperty({ description: 'Panel member IDs', example: ['507f1f77bcf86cd799439011'] })
    @IsArray()
    @IsMongoId({ each: true })
    @IsNotEmpty()
    panel: string[];

    @ApiPropertyOptional({ description: 'Video meeting link (for remote interviews)' })
    @IsString()
    @IsOptional()
    videoLink?: string;

    @ApiPropertyOptional({ description: 'Interview location (for in-person)' })
    @IsString()
    @IsOptional()
    location?: string;

    @ApiPropertyOptional({ description: 'Additional notes for interviewers' })
    @IsString()
    @IsOptional()
    notes?: string;
}

export class UpdateInterviewDto {
    @ApiPropertyOptional({ 
        description: 'New scheduled date', 
        example: '2025-12-15T10:00:00Z' 
    })
    @IsDateString()
    @IsOptional()
    scheduledDate?: string;

    @ApiPropertyOptional({ 
        description: 'Interview status', 
        enum: InterviewStatus,
        example: 'SCHEDULED'
    })
    @IsEnum(InterviewStatus)
    @IsOptional()
    status?: InterviewStatus;

    @ApiPropertyOptional({ 
        description: 'Updated panel members', 
        example: ['507f1f77bcf86cd799439015', '507f1f77bcf86cd799439016'] 
    })
    @IsArray()
    @IsMongoId({ each: true })
    @IsOptional()
    panel?: string[];

    @ApiPropertyOptional({ 
        description: 'Video link',
        example: 'https://meet.google.com/abc-defg-hij' 
    })
    @IsString()
    @IsOptional()
    videoLink?: string;

    @ApiPropertyOptional({ 
        description: 'Calendar event ID',
        example: 'cal_event_123456789' 
    })
    @IsString()
    @IsOptional()
    calendarEventId?: string;
}

export class CancelInterviewDto {
    @ApiProperty({ description: 'Cancellation reason' })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiPropertyOptional({ description: 'Notify candidate', default: true })
    notifyCandidate?: boolean;

    @ApiPropertyOptional({ description: 'Notify panel members', default: true })
    notifyPanel?: boolean;
}
