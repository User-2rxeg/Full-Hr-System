import { IsOptional, IsString, IsEnum } from 'class-validator';
import { DisputeStatus } from '../enums/payroll-tracking-enum';

export class UpdateDisputeDto {
    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(DisputeStatus)
    status?: DisputeStatus;

    @IsOptional()
    @IsString()
    rejectionReason?: string;

    @IsOptional()
    @IsString()
    resolutionComment?: string;
}