import { IsNotEmpty, IsString, IsNumber, Min, Max } from 'class-validator';

export class CreateInsuranceDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  createdByEmployeeId: string; // Keep original name

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  minSalary: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  maxSalary: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  employeeRate: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  employerRate: number;
}