import { IsMongoId, IsNumber, Min, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { AdjustmentType } from '../enums/adjustment-type.enum';

export class AdjustBalanceDto {
  @IsMongoId()
  employeeId: string;

  @IsMongoId()
  leaveTypeId: string;

  @IsEnum(AdjustmentType)
  adjustmentType: AdjustmentType;

  @Type(() => Number)
  @IsNumber()
  // amount can be negative or positive depending on adjustment type — adjust validation if needed
  amount: number;

  @IsString()
  reason: string;

  @IsMongoId()
  hrUserId: string;
}
