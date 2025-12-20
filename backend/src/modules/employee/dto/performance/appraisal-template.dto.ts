import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AppraisalRatingScaleType,
  AppraisalTemplateType,
} from '../../enums/performance.enums';

export class RatingScaleDto {
  @IsEnum(AppraisalRatingScaleType)
  @IsNotEmpty()
  type: AppraisalRatingScaleType;

  @IsNumber()
  @IsNotEmpty()
  min: number;

  @IsNumber()
  @IsNotEmpty()
  max: number;

  @IsNumber()
  @IsOptional()
  step?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];
}

export class EvaluationCriterionDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  details?: string;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsNumber()
  @IsOptional()
  maxScore?: number;

  @IsBoolean()
  @IsOptional()
  required?: boolean;
}

export class CreateAppraisalTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AppraisalTemplateType)
  @IsNotEmpty()
  templateType: AppraisalTemplateType;

  @ValidateNested()
  @Type(() => RatingScaleDto)
  @IsNotEmpty()
  ratingScale: RatingScaleDto;

  @ValidateNested({ each: true })
  @Type(() => EvaluationCriterionDto)
  @IsArray()
  @IsOptional()
  criteria?: EvaluationCriterionDto[];

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  applicableDepartmentIds?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  applicablePositionIds?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAppraisalTemplateDto extends PartialType(
  CreateAppraisalTemplateDto,
) {}

