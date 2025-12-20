import { PartialType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ApprovalDecision,
  StructureRequestStatus,
  StructureRequestType,
} from '../../enums/organization-structure.enums';

export class CreateStructureChangeRequestDto {
  @IsOptional()
  @IsString()
  requestNumber?: string;

  @IsMongoId()
  requestedByEmployeeId: string;

  @IsEnum(StructureRequestType)
  requestType: StructureRequestType;

  @IsOptional()
  @IsMongoId()
  targetDepartmentId?: string;

  @IsOptional()
  @IsMongoId()
  targetPositionId?: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SubmitStructureChangeRequestDto {
  @IsMongoId()
  submittedByEmployeeId: string;
}

export class UpdateStructureChangeRequestDto extends PartialType(
  CreateStructureChangeRequestDto,
) {
  @IsOptional()
  @IsEnum(StructureRequestStatus)
  status?: StructureRequestStatus;
}

export class ReviewStructureChangeRequestDto {
  @IsMongoId()
  approverEmployeeId: string;

  @IsEnum(ApprovalDecision)
  decision: ApprovalDecision;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class StructureChangeRequestFilterDto {
  @IsOptional()
  @IsEnum(StructureRequestStatus)
  status?: StructureRequestStatus;

  @IsOptional()
  @IsEnum(StructureRequestType)
  requestType?: StructureRequestType;

  @IsOptional()
  @IsMongoId()
  requestedByEmployeeId?: string;
}

