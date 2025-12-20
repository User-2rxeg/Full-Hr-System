import { PartialType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ApprovalDecision,
  StructureRequestStatus,
  StructureRequestType,
} from '../../enums/organization-structure.enums';

export class SubmitStructureRequestDto {
  @IsString()
  @IsOptional()
  requestNumber?: string;

  @IsMongoId()
  @IsOptional()
  requestedByEmployeeId?: string;

  @IsEnum(StructureRequestType)
  requestType: StructureRequestType;

  @IsMongoId()
  @IsOptional()
  targetDepartmentId?: string;

  @IsMongoId()
  @IsOptional()
  targetPositionId?: string;

  @IsString()
  @IsOptional()
  details?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateStructureRequestDto extends PartialType(
  SubmitStructureRequestDto,
) {
  @IsEnum(StructureRequestStatus)
  @IsOptional()
  status?: StructureRequestStatus;
}

export class SubmitApprovalDecisionDto {
  @IsMongoId()
  @IsOptional()
  approverEmployeeId?: string;

  @IsEnum(ApprovalDecision)
  decision: ApprovalDecision;

  @IsString()
  @IsOptional()
  comments?: string;
}

