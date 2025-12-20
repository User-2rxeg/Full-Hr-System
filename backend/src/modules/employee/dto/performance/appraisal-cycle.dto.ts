import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AppraisalCycleStatus,
  AppraisalTemplateType,
} from '../../enums/performance.enums';

export class CycleTemplateAssignmentDto {
  @IsMongoId()
  @IsNotEmpty()
  templateId: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  departmentIds?: string[];
}

export class CreateAppraisalCycleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AppraisalTemplateType)
  @IsNotEmpty()
  cycleType: AppraisalTemplateType;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsDateString()
  @IsOptional()
  managerDueDate?: string;

  @IsDateString()
  @IsOptional()
  employeeAcknowledgementDueDate?: string;

  @ValidateNested({ each: true })
  @Type(() => CycleTemplateAssignmentDto)
  @IsArray()
  @IsOptional()
  templateAssignments?: CycleTemplateAssignmentDto[];
}

export class UpdateAppraisalCycleDto extends PartialType(
  CreateAppraisalCycleDto,
) {
  @IsEnum(AppraisalCycleStatus)
  @IsOptional()
  status?: AppraisalCycleStatus;
}

export class ActivateAppraisalCycleDto {
  @IsString()
  @IsNotEmpty()
  cycleId: string;

  @IsDateString()
  @IsOptional()
  activationDate?: string;
}

export class CloseAppraisalCycleDto {
  @IsString()
  @IsNotEmpty()
  cycleId: string;

  @IsDateString()
  @IsOptional()
  closureDate?: string;
}
