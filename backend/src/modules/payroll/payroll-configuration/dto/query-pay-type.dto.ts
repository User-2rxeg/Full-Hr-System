import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ConfigStatus } from '../../payroll-configuration/enums/payroll-configuration-enums';

/**
 * PHASE 1 — DEFINE STRUCTURE
 * REQ-PY-5: Pay types configuration (Create, Edit, View)
 * 
 * DTO for querying and filtering pay types
 * Supports pagination, filtering, and search functionality
 */
export class QueryPayTypeDto {
  @IsOptional()
  @IsEnum(ConfigStatus, {
    message: 'status must be one of: draft, approved, rejected'
  })
  status?: ConfigStatus;

  @IsOptional()
  @IsString()
  createdByEmployeeId?: string;

  @IsOptional()
  @IsString()
  search?: string; // Search by type name

  // Pagination
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}