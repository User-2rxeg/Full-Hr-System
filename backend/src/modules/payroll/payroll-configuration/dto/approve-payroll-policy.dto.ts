import { IsNotEmpty, IsString } from 'class-validator';

/**
 * PHASE 1 — DEFINE STRUCTURE
 * REQ-PY-1: Publishing requires Payroll Manager approval
 * 
 * DTO for approving or rejecting a payroll policy
 * Used by Payroll Managers to change policy status from DRAFT to APPROVED/REJECTED
 */
export class ApprovePayrollPolicyDto {
  @IsNotEmpty()
  @IsString()
  approvedBy: string; // employee ID of the Payroll Manager approving/rejecting
}