// dto/approve-termination-benefit.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class ApproveTerminationBenefitDto {
  @IsNotEmpty()
  @IsString()
  approvedBy: string; // employee ID of the HR/Payroll Specialist approving
}