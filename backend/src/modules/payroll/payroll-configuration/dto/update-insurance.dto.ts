import { IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateInsuranceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSalary?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSalary?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  employeeRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  employerRate?: number;
}