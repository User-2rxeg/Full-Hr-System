import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ApproveInsuranceDto {
  @IsString()
  @IsNotEmpty()
  approvedBy: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
