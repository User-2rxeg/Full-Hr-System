import { PartialType } from '@nestjs/mapped-types';
import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AppraisalDisputeStatus } from '../../enums/performance.enums';

export class FileAppraisalDisputeDto {
  @IsMongoId()
  @IsNotEmpty()
  appraisalId: string;

  @IsMongoId()
  @IsNotEmpty()
  assignmentId: string;

  @IsMongoId()
  @IsNotEmpty()
  cycleId: string;

  @IsMongoId()
  @IsNotEmpty()
  raisedByEmployeeId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  details?: string;

  @IsDateString()
  @IsOptional()
  submittedAt?: string;
}

export class ResolveAppraisalDisputeDto {
  @IsMongoId()
  @IsNotEmpty()
  disputeId: string;

  @IsMongoId()
  @IsNotEmpty()
  resolvedByEmployeeId: string;

  @IsString()
  @IsNotEmpty()
  resolutionSummary: string;

  @IsString()
  @IsNotEmpty()
  status: AppraisalDisputeStatus;

  @IsDateString()
  @IsOptional()
  resolvedAt?: string;
}

export class UpdateAppraisalDisputeDto extends PartialType(
  FileAppraisalDisputeDto,
) {
  @IsString()
  @IsOptional()
  status?: AppraisalDisputeStatus;

  @IsString()
  @IsOptional()
  resolutionSummary?: string;

  @IsMongoId()
  @IsOptional()
  resolvedByEmployeeId?: string;
}

