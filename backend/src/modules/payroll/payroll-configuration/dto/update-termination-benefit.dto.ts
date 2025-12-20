// dto/update-termination-benefit.dto.ts
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class UpdateTerminationBenefitDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  terms?: string;
}