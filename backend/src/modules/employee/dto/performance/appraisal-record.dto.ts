import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RatingEntryDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsNotEmpty()
  ratingValue: number;

  @IsString()
  @IsOptional()
  ratingLabel?: string;

  @IsNumber()
  @IsOptional()
  weightedScore?: number;

  @IsString()
  @IsOptional()
  comments?: string;
}

export class SubmitAppraisalRecordDto {
  @IsMongoId()
  @IsNotEmpty()
  assignmentId: string;

  @ValidateNested({ each: true })
  @Type(() => RatingEntryDto)
  @IsArray()
  @IsNotEmpty()
  ratings: RatingEntryDto[];

  @IsNumber()
  @IsOptional()
  totalScore?: number;

  @IsString()
  @IsOptional()
  overallRatingLabel?: string;

  @IsString()
  @IsOptional()
  managerSummary?: string;

  @IsString()
  @IsOptional()
  strengths?: string;

  @IsString()
  @IsOptional()
  improvementAreas?: string;
}

export class PublishAppraisalRecordDto {
  @IsMongoId()
  @IsNotEmpty()
  recordId: string;

  @IsMongoId()
  @IsNotEmpty()
  publishedByEmployeeId: string;

  @IsDateString()
  @IsOptional()
  publishDate?: string;
}

export class EmployeeAcknowledgeAppraisalDto {
  @IsMongoId()
  @IsNotEmpty()
  recordId: string;

  @IsString()
  @IsOptional()
  acknowledgementComment?: string;

  @IsDateString()
  @IsOptional()
  acknowledgedAt?: string;
}

export class UpdateAppraisalRecordDto extends PartialType(
  SubmitAppraisalRecordDto,
) {}


