// approve-allowance.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class ApproveAllowanceDto {
  @IsNotEmpty()
  @IsString()
  approvedBy: string; // employee ID of the Payroll Manager approving/rejecting
}