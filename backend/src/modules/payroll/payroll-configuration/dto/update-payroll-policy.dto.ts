import { IsOptional, IsString, IsEnum, IsDateString, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PolicyType, Applicability } from '../../payroll-configuration/enums/payroll-configuration-enums';

class RuleDefinitionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  thresholdAmount?: number;
}

export class UpdatePayrollPolicyDto {
  @IsOptional()
  @IsString()
  policyName?: string;

  @IsOptional()
  @IsEnum(PolicyType)
  policyType?: PolicyType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RuleDefinitionDto)
  ruleDefinition?: RuleDefinitionDto;

  @IsOptional()
  @IsEnum(Applicability)
  applicability?: Applicability;
}