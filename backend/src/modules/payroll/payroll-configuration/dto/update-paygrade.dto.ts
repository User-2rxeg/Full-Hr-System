import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class UpdatePayGradeDto {
  @IsString()
  @IsOptional()
  grade?: string;

  @IsNumber()
  @Min(6000)
  @IsOptional()
  baseSalary?: number;

  @IsNumber()
  @Min(6000)
  @IsOptional()
  grossSalary?: number;
}

