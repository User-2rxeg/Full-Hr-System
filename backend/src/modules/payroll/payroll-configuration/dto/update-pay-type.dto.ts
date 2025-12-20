import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

/**
 * PHASE 1 — DEFINE STRUCTURE
 * REQ-PY-5: Pay types configuration (Create, Edit, View)
 * 
 * DTO for updating an existing pay type
 * All fields are optional to allow partial updates
 * 
 * Business Rule: Editing is allowed ONLY while status is Draft
 * This validation is enforced at the service level
 */
export class UpdatePayTypeDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(6000)
  amount?: number;
}