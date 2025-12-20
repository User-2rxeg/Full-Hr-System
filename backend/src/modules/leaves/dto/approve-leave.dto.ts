import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class ApproveLeaveDto {
    @IsOptional()
    @IsString()
    comment?: string;

    // for HR override allowing negative balances or converting to unpaid
    @IsOptional()
    @IsBoolean()
    overrideAllowNegative?: boolean;
}