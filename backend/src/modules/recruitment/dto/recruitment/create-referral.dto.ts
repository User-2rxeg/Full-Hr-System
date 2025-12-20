import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';

/**
 * REC-030: Tag candidates as referrals for preferential filtering
 * Referrals get higher chance of earlier interview
 */
export class CreateReferralDto {
    @ApiProperty({ description: 'Referring employee ID', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsNotEmpty()
    referringEmployeeId: string;

    @ApiProperty({ description: 'Candidate ID being referred', example: '507f1f77bcf86cd799439011' })
    @IsMongoId()
    @IsNotEmpty()
    candidateId: string;

    @ApiPropertyOptional({ description: 'Role being referred for', example: 'Software Engineer' })
    @IsString()
    @IsOptional()
    role?: string;

    @ApiPropertyOptional({ description: 'Seniority level', example: 'Senior' })
    @IsString()
    @IsOptional()
    level?: string;

    @ApiPropertyOptional({ description: 'Referral notes' })
    @IsString()
    @IsOptional()
    notes?: string;
}
