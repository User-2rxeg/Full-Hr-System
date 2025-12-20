// query-allowance.dto.ts
import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ConfigStatus } from '../../payroll-configuration/enums/payroll-configuration-enums';
export class QueryAllowanceDto {
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
  search?: string; // Search by allowance name

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