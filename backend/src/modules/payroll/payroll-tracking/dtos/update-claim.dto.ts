import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { ClaimStatus } from '../enums/payroll-tracking-enum';

export class UpdateClaimDto {
    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    claimType?: string;

    @IsOptional()
    @IsNumber()
    amount?: number;

    @IsOptional()
    @IsNumber()
    approvedAmount?: number;

    @IsOptional()
    @IsEnum(ClaimStatus)
    status?: ClaimStatus;

    @IsOptional()
    @IsString()
    rejectionReason?: string;

    @IsOptional()
    @IsString()
    resolutionComment?: string;
}