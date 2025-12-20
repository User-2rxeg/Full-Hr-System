import { IsString, IsBoolean, IsOptional, IsMongoId, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { AttachmentType } from '../enums/attachment-type.enum';

export class CreateLeaveTypeDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsMongoId()
  categoryId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @IsBoolean()
  deductible?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresAttachment?: boolean;

  @IsOptional()
  @IsEnum(AttachmentType)
  attachmentType?: AttachmentType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minTenureMonths?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDurationDays?: number;
}
