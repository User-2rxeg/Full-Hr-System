import { IsString, IsNumber, Min, IsNotEmpty } from 'class-validator';

export class CreatePayGradeDto {
  @IsString()
  @IsNotEmpty()
  grade: string;

  @IsNumber()
  @Min(6000)
  baseSalary: number;

  @IsNumber()
  @Min(6000)
  grossSalary: number;

  @IsString()
  @IsNotEmpty()
  createdByEmployeeId: string;
}

