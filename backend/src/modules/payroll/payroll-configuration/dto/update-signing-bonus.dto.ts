import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

/**
 * PHASE 1 — DEFINE STRUCTURE
 * REQ-PY-19: Signing bonus policies configuration
 * 
 * DTO for updating an existing signing bonus policy
 * All fields are optional to allow partial updates
 * 
 * Business Rule: Editing is allowed ONLY while status is Draft
 * This validation is enforced at the service level
 */
export class UpdateSigningBonusDto {
  @IsOptional()
  @IsString()
  positionName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}