import { IsNotEmpty, IsString } from 'class-validator';

/**
 * PHASE 1 — DEFINE STRUCTURE
 * REQ-PY-5: Publishing requires Payroll Manager approval
 * 
 * DTO for approving or rejecting a pay type
 * Used by Payroll Managers to change pay type status from DRAFT to APPROVED/REJECTED
 */
export class ApprovePayTypeDto {
  @IsNotEmpty()
  @IsString()
  approvedBy: string; // employee ID of the Payroll Manager approving/rejecting
}