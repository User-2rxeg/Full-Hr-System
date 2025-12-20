// create-pay-type.dto.ts
import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class CreatePayTypeDto {
  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(6000)
  amount: number;

  @IsNotEmpty()
  @IsString()
  createdByEmployeeId: string;

  // Remove companyId and code since they don't exist in schema
  // @IsNotEmpty()
  // @IsString()
  // companyId: string;

  // @IsNotEmpty()
  // @IsString()
  // code: string;
}