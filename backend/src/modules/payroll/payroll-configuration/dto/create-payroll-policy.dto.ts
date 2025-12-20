import { IsNotEmpty, IsString, IsEnum, IsDateString, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PolicyType, Applicability } from '../../payroll-configuration/enums/payroll-configuration-enums';

/**
 * PHASE 1 — DEFINE STRUCTURE
 * REQ-PY-1: Payroll policies configuration (Create, Edit, View)
 * 
 * Nested DTO for rule definition structure
 * BR9: Supports base pay, allowances, deductions, and other variable pay elements
 */
class RuleDefinitionDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  fixedAmount: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  thresholdAmount: number;
}

/**
 * DTO for creating a new payroll policy
 * All fields are required as per business rules
 * Status will be automatically set to DRAFT upon creation
 */
export class CreatePayrollPolicyDto {
  @IsNotEmpty()
  @IsString()
  policyName: string;

  @IsNotEmpty()
  @IsEnum(PolicyType, {
    message: 'policyType must be one of: Deduction, Allowance, Benefit, Misconduct, Leave'
  })
  policyType: PolicyType;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsDateString()
  effectiveDate: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => RuleDefinitionDto)
  ruleDefinition: RuleDefinitionDto;

  @IsNotEmpty()
  @IsEnum(Applicability, {
    message: 'applicability must be one of: All Employees, Full Time Employees, Part Time Employees, Contractors'
  })
  applicability: Applicability;

  @IsNotEmpty()
  @IsString()
  createdByEmployeeId: string;
}