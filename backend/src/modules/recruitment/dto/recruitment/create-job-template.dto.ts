import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

/**
 * REC-003: Create standardized job description templates
 * Each job requisition must include Job details (title, department, location, openings)
 * and Qualifications and skills needed.
 */
export class CreateJobTemplateDto {
    @ApiProperty({ description: 'Job title', example: 'Software Engineer' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: 'Department name', example: 'Engineering' })
    @IsString()
    @IsNotEmpty()
    department: string;

    @ApiPropertyOptional({ description: 'Job description', example: 'Develop and maintain software applications...' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Required qualifications', example: ['Bachelor in CS', '3+ years experience'] })
    @IsArray()
    @IsString({ each: true })
    qualifications: string[];

    @ApiProperty({ description: 'Required skills', example: ['JavaScript', 'TypeScript', 'NestJS'] })
    @IsArray()
    @IsString({ each: true })
    skills: string[];
}

export class UpdateJobTemplateDto {
    @ApiPropertyOptional({ description: 'Job title' })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({ description: 'Department name' })
    @IsString()
    @IsOptional()
    department?: string;

    @ApiPropertyOptional({ description: 'Job description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Required qualifications' })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    qualifications?: string[];

    @ApiPropertyOptional({ description: 'Required skills' })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    skills?: string[];
}
