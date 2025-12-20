import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  //@IsMongoId()
  @IsNotEmpty()
  departmentId: string;

  @IsMongoId()
  @IsOptional()
  reportsToPositionId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;
}

export class UpdatePositionDto extends PartialType(CreatePositionDto) {}
