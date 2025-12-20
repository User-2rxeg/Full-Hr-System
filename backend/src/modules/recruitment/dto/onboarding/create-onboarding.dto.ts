import { IsMongoId, IsNotEmpty, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateOnboardingTaskDto } from './create-onboarding-task.dto';

export class CreateOnboardingDto {
    @ApiProperty({ description: 'employee ID', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @ApiProperty({ description: 'Contract ID', example: '507f1f77bcf86cd799439012' })
    @IsMongoId()
    @IsNotEmpty()
    contractId: string;

    @ApiPropertyOptional({ description: 'List of onboarding tasks', type: [CreateOnboardingTaskDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOnboardingTaskDto)
    @IsOptional()
    tasks?: CreateOnboardingTaskDto[];
}

