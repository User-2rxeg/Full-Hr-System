import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsMongoId, IsOptional, IsEmail, IsEnum } from 'class-validator';

/**
 * REC-017: Candidate receives updates about application status
 * REC-022: Automated rejection notifications and templates
 * Communication logs must be stored in the applicant profile
 */

export enum NotificationType {
    APPLICATION_RECEIVED = 'application_received',
    STAGE_UPDATE = 'stage_update',
    INTERVIEW_SCHEDULED = 'interview_scheduled',
    INTERVIEW_REMINDER = 'interview_reminder',
    OFFER_SENT = 'offer_sent',
    REJECTION = 'rejection',
    GENERAL = 'general',
}

export class SendNotificationDto {
    @ApiProperty({
        description: 'Application ID',
        example: '692df406e5d9b085bcd29cc6'
    })
    @IsMongoId()
    @IsNotEmpty()
    applicationId: string;

    @ApiProperty({
        description: 'Candidate ID',
        example: '675c1a2b3d4e5f6789012345'
    })
    @IsMongoId()
    @IsNotEmpty()
    candidateId: string;

    @ApiProperty({
        description: 'Candidate email',
        example: 'candidate@example.com'
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Notification type',
        enum: NotificationType,
        example: 'application_received'
    })
    @IsEnum(NotificationType)
    @IsNotEmpty()
    type: NotificationType;

    @ApiPropertyOptional({
        description: 'Email subject',
        example: 'Application Status Update'
    })
    @IsString()
    @IsOptional()
    subject?: string;

    @ApiPropertyOptional({
        description: 'Email content',
        example: 'Your application status has been updated. Please check your portal for details.'
    })
    @IsString()
    @IsOptional()
    content?: string;

    @ApiPropertyOptional({
        description: 'Use template ID',
        example: '507f1f77bcf86cd799439020'
    })
    @IsMongoId()
    @IsOptional()
    templateId?: string;
}

/**
 * REC-022: Rejection notification with template
 */
export class SendRejectionDto {
    @ApiProperty({
        description: 'Application ID',
        example: '692df406e5d9b085bcd29cc6'
    })
    @IsMongoId()
    @IsNotEmpty()
    applicationId: string;

    @ApiProperty({
        description: 'Candidate email',
        example: 'candidate@example.com'
    })
    @IsEmail()
    @IsNotEmpty()
    candidateEmail: string;

    @ApiPropertyOptional({ description: 'Rejection reason (internal use)' })
    @IsString()
    @IsOptional()
    rejectionReason?: string;

    @ApiPropertyOptional({ description: 'Custom message for candidate' })
    @IsString()
    @IsOptional()
    customMessage?: string;

    @ApiPropertyOptional({ description: 'Full email body message' })
    @IsString()
    @IsOptional()
    message?: string;

    @ApiPropertyOptional({
        description: 'Use specific template ID',
        example: '507f1f77bcf86cd799439021'
    })
    @IsMongoId()
    @IsOptional()
    templateId?: string;
}

export class CreateEmailTemplateDto {
    @ApiProperty({ description: 'Template name', example: 'Standard Rejection' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Template type', enum: NotificationType })
    @IsEnum(NotificationType)
    @IsNotEmpty()
    type: NotificationType;

    @ApiProperty({ description: 'Email subject template' })
    @IsString()
    @IsNotEmpty()
    subject: string;

    @ApiProperty({ description: 'Email body template (supports placeholders like {{candidateName}})' })
    @IsString()
    @IsNotEmpty()
    body: string;
}
