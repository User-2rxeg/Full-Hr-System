import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsMongoId, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApplicationStage } from '../../enums/application-stage.enum';
import { ApplicationStatus } from '../../enums/application-status.enum';

/**
 * REC-007: Candidate uploads CV and applies for positions
 * REC-028: Candidate gives consent for personal-data processing
 */
export class CreateApplicationDto {
    @ApiProperty({ description: 'Candidate ID', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsNotEmpty()
    candidateId: string;

    @ApiProperty({ description: 'Job Requisition ID', example: 'REQ-2025-0001' })
    @IsString()
    @IsNotEmpty()
    requisitionId: string;

    @ApiProperty({ description: 'CV file path or URL' })
    @IsString()
    @IsNotEmpty()
    cvFilePath: string;

    @ApiProperty({ description: 'Cover letter (optional)' })
    @IsString()
    @IsOptional()
    coverLetter?: string;

    @ApiProperty({ description: 'GDPR consent for data processing', example: true })
    @IsBoolean()
    @IsNotEmpty()
    dataProcessingConsent: boolean;

    @ApiProperty({ description: 'Consent for background checks', example: true })
    @IsBoolean()
    @IsOptional()
    backgroundCheckConsent?: boolean;
}

/**
 * REC-008: Track candidates through each stage
 */
export class UpdateApplicationStageDto {
    @ApiProperty({ description: 'New application stage', enum: ApplicationStage })
    @IsEnum(ApplicationStage)
    @IsNotEmpty()
    stage: ApplicationStage;

    @ApiPropertyOptional({ description: 'Notes for stage change' })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiPropertyOptional({ description: 'Changed by user ID' })
    @IsMongoId()
    @IsOptional()
    changedBy?: string;
}

export class UpdateApplicationStatusDto {
    @ApiProperty({ description: 'New application status', enum: ApplicationStatus })
    @IsEnum(ApplicationStatus)
    @IsNotEmpty()
    status: ApplicationStatus;

    @ApiPropertyOptional({ description: 'Reason for status change' })
    @IsString()
    @IsOptional()
    reason?: string;
}

export class AssignHrDto {
    @ApiProperty({ 
        description: 'HR employee ID to assign',
        example: '507f1f77bcf86cd799439013' 
    })
    @IsMongoId()
    @IsNotEmpty()
    hrEmployeeId: string;
}
