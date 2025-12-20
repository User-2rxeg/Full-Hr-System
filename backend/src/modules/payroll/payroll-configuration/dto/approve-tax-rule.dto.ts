import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ApproveTaxRuleDto {
  @IsString()
  @IsNotEmpty()
  approvedBy: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
