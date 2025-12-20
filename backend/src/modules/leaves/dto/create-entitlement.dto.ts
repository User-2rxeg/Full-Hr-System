import { IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEntitlementDto {
  @IsMongoId()
  employeeId: string;

  @IsMongoId()
  leaveTypeId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  yearlyEntitlement?: number;

  // optional initial values if you want to set accrual/carry/taken on creation
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  accruedActual?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  accruedRounded?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carryForward?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taken?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  remaining?: number;
}
