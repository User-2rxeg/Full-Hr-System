import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class UpdateTaxRuleDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rate?: number;
}