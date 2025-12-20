import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PolicyType, Applicability, ConfigStatus } from '../../payroll-configuration/enums/payroll-configuration-enums';

export class QueryPayrollPolicyDto {
  @IsOptional()
  @IsEnum(PolicyType)
  policyType?: PolicyType;

  @IsOptional()
  @IsEnum(ConfigStatus)
  status?: ConfigStatus;

  @IsOptional()
  @IsEnum(Applicability)
  applicability?: Applicability;

  @IsOptional()
  @IsString()
  createdByEmployeeId?: string;

  @IsOptional()
  @IsString()
  search?: string; // For searching by policyName or description

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