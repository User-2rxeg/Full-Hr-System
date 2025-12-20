// dto/create-termination-benefit.dto.ts
import { IsNotEmpty, IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateTerminationBenefitDto {
  @IsNotEmpty()
  @IsString()
  name: string; // e.g., "End of Service Gratuity", "Severance Pay"

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsNotEmpty()
  @IsString()
  createdByEmployeeId: string;
}