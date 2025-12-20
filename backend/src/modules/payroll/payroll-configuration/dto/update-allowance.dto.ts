// update-allowance.dto.ts
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class UpdateAllowanceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}