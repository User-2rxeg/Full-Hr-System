import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

/**
 * PHASE 1 — DEFINE STRUCTURE
 * REQ-PY-19: Signing bonus policies configuration
 * 
 * DTO for creating a new signing bonus policy
 * All fields are required as per business rules
 * Status will be automatically set to DRAFT upon creation
 * 
 * Business Rule BR56: Signing bonuses are distinct payroll components with approval workflow
 * Linked to contract details from Onboarding module
 */
export class CreateSigningBonusDto {
  @IsNotEmpty()
  @IsString()
  positionName: string; // e.g., "Junior TA", "Mid TA", "Senior TA"

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number; // Signing bonus amount for this position

  @IsNotEmpty()
  @IsString()
  createdByEmployeeId: string;
}