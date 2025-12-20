import { IsString, IsArray, IsDateString, IsNumber, IsOptional } from 'class-validator';
import { EmployeePayrollLineDto } from './employee-payline.dto';
import { Type } from 'class-transformer';

export class PayrollDraftResponseDto {
  @IsString()
  id!: string;

  @IsString()
  payrollAreaId!: string;

  @IsDateString()
  generatedAt!: string;

  @IsArray()
  @Type(() => EmployeePayrollLineDto)
  payrollLines!: EmployeePayrollLineDto[];

  @IsNumber()
  @IsOptional()
  totalGross?: number;

  @IsNumber()
  @IsOptional()
  totalNet?: number;
}
