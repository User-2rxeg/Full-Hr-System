import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class CreateAllowanceDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  @IsString()
  createdByEmployeeId: string;
}