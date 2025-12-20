import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsMongoId, IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * REC-011: Provide feedback/interview score for scheduled interviews
 * The system must allow adding comments and ratings at each stage
 */

export class SubmitFeedbackDto {
    @ApiProperty({ description: 'Interview ID' })
    @IsMongoId()
    @IsNotEmpty()
    interviewId: string;

    @ApiProperty({ description: 'Interviewer ID' })
    @IsMongoId()
    @IsNotEmpty()
    interviewerId: string;

    @ApiProperty({ description: 'Score (1-10)', example: 8, minimum: 1, maximum: 10 })
    @IsNumber()
    @Min(1, { message: 'Score must be at least 1' })
    @Max(10, { message: 'Score must be at most 10' })
    score: number;

    @ApiPropertyOptional({ description: 'Comments and feedback' })
    @IsString()
    @IsOptional()
    comments?: string;
}
