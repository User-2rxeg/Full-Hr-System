import { IsOptional, IsString, IsNumber, IsEnum, IsMongoId } from 'class-validator';
import { RefundStatus } from '../enums/payroll-tracking-enum';

export class UpdateRefundDto {
    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    amount?: number;

    @IsOptional()
    @IsEnum(RefundStatus)
    status?: RefundStatus;

    @IsOptional()
    @IsMongoId()
    paidInPayrollRunId?: string;
}