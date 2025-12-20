import { IsNotEmpty, IsString } from 'class-validator';

/**
 * PHASE 1 — DEFINE STRUCTURE
 * REQ-PY-19: Publishing requires Payroll Manager approval
 * 
 * DTO for approving or rejecting a signing bonus policy
 * Used by Payroll Managers to change status from DRAFT to APPROVED/REJECTED
 * 
 * BR56: Signing bonuses require approval workflow
 */
export class ApproveSigningBonusDto {
  @IsNotEmpty()
  @IsString()
  approvedBy: string; // employee ID of the Payroll Manager approving/rejecting
}