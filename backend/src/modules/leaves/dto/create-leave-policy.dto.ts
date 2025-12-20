import { IsMongoId, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { AccrualMethod } from '../enums/accrual-method.enum';
import { RoundingRule } from '../enums/rounding-rule.enum';

export class CreateLeavePolicyDto {
  @IsMongoId() leaveTypeId: string;
  @IsEnum(AccrualMethod) accrualMethod: AccrualMethod;
  @IsOptional() @IsNumber() monthlyRate?: number;
  @IsOptional() @IsNumber() yearlyRate?: number;
  @IsOptional() carryForwardAllowed?: boolean;
  @IsOptional() @IsNumber() maxCarryForward?: number;
  @IsOptional() @IsNumber() expiryAfterMonths?: number;
  @IsOptional() @IsEnum(RoundingRule) roundingRule?: RoundingRule;
  @IsOptional() @IsNumber() minNoticeDays?: number;
  @IsOptional() @IsNumber() maxConsecutiveDays?: number;
}
