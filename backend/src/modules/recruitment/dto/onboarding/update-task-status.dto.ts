import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { OnboardingTaskStatus } from '../../enums/onboarding-task-status.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskStatusDto {
    @ApiProperty({ enum: OnboardingTaskStatus, description: 'New task status' })
    @IsEnum(OnboardingTaskStatus)
    status: OnboardingTaskStatus;

    @ApiPropertyOptional({ description: 'Completion date', example: '2025-12-15T10:30:00.000Z' })
    @IsDateString()
    @IsOptional()
    completedAt?: string;
}

