import { IsString, IsNumber } from 'class-validator';

export class EmployeePayrollLineDto {
  @IsString()
  employeeId!: string;

  @IsString()
  employeeName!: string;

  @IsNumber()
  grossSalary!: number;

  @IsNumber()
  taxes!: number;

  @IsNumber()
  insurance!: number;

  @IsNumber()
  penalties!: number;

  @IsNumber()
  refunds!: number;

  @IsNumber()
  netSalary!: number;
}
