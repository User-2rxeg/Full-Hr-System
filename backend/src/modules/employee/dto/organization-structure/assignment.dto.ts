import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class AssignPositionDto {
  @IsMongoId()
  @IsNotEmpty()
  employeeProfileId: string;

  @IsMongoId()
  @IsNotEmpty()
  positionId: string;

  @IsMongoId()
  @IsOptional()
  departmentId?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsMongoId()
  @IsOptional()
  changeRequestId?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class EndAssignmentDto {
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsMongoId()
  @IsOptional()
  changeRequestId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AssignmentQueryDto {
  @IsMongoId()
  @IsOptional()
  employeeProfileId?: string;

  @IsMongoId()
  @IsOptional()
  positionId?: string;

  @IsMongoId()
  @IsOptional()
  departmentId?: string;
}

