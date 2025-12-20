import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsMongoId, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * REC-004, REC-023: Create job requisitions for posting
 * Each job requisition must include Job details (title, department, location, openings)
 */
export class CreateJobRequisitionDto {
    @ApiPropertyOptional({ description: 'Job template ID to use', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsOptional()
    templateId?: string;

    @ApiProperty({ description: 'Custom job title (if no template)', example: 'Senior Software Engineer' })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiProperty({ description: 'Department', example: 'Engineering' })
    @IsString()
    @IsOptional()
    department?: string;

    @ApiProperty({ description: 'Job location', example: 'Cairo, Egypt' })
    @IsString()
    @IsNotEmpty()
    location: string;

    @ApiProperty({ description: 'Number of openings', example: 3 })
    @IsNumber()
    @Min(1)
    openings: number;

    @ApiProperty({ description: 'Hiring manager ID', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsNotEmpty()
    hiringManagerId: string;

    @ApiPropertyOptional({ description: 'Job expiry date', example: '2025-12-31' })
    @Transform(({ value }) => {
        if (typeof value === 'string' && value) {
            // Handle various date formats and normalize to ISO string
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        }
        return value;
    })
    @IsDateString()
    @IsOptional()
    expiryDate?: string;

    @ApiPropertyOptional({ description: 'Job description override' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Qualifications override' })
    @IsOptional()
    qualifications?: string[];

    @ApiPropertyOptional({ description: 'Skills override' })
    @IsOptional()
    skills?: string[];
}

export class PublishJobRequisitionDto {
    @ApiProperty({ description: 'Publish status', enum: ['draft', 'published', 'closed'] })
    @IsEnum(['draft', 'published', 'closed'])
    publishStatus: string;

    @ApiPropertyOptional({ description: 'Posting date' })
    @Transform(({ value }) => {
        if (typeof value === 'string' && value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        }
        return value;
    })
    @IsDateString()
    @IsOptional()
    postingDate?: string;
}

export class UpdateJobRequisitionDto {
    @ApiPropertyOptional({ description: 'Job location' })
    @IsString()
    @IsOptional()
    location?: string;

    @ApiPropertyOptional({ description: 'Number of openings' })
    @IsNumber()
    @Min(1)
    @IsOptional()
    openings?: number;

    @ApiPropertyOptional({ description: 'Expiry date' })
    @Transform(({ value }) => {
        if (typeof value === 'string' && value) {
            // Handle various date formats and normalize to ISO string
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        }
        return value;
    })
    @IsDateString()
    @IsOptional()
    expiryDate?: string;
}
