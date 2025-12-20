import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AppraisalAssignmentStatus } from '../../enums/performance.enums';

export class CreateAppraisalAssignmentDto {
  @IsMongoId()
  @IsNotEmpty()
  cycleId: string;

  @IsMongoId()
  @IsNotEmpty()
  templateId: string;

  @IsMongoId()
  @IsNotEmpty()
  employeeProfileId: string;

  @IsMongoId()
  @IsNotEmpty()
  managerProfileId: string;

  @IsMongoId()
  @IsNotEmpty()
  departmentId: string;

  @IsMongoId()
  @IsOptional()
  positionId?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class BulkCreateAppraisalAssignmentDto {
  @IsMongoId()
  @IsNotEmpty()
  cycleId: string;

  @IsMongoId()
  @IsNotEmpty()
  templateId: string;

  @IsMongoId()
  @IsNotEmpty()
  departmentId: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty()
  employeeProfileIds: string[];

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class UpdateAppraisalAssignmentDto extends PartialType(
  CreateAppraisalAssignmentDto,
) {}
