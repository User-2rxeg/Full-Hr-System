import { IsNotEmpty, IsString, IsNumber, IsOptional, IsMongoId, IsEnum, Min } from 'class-validator';
import { RefundStatus } from '../enums/payroll-tracking-enum';

export class RefundDetailsDto {
    @IsNotEmpty()
    @IsString()
    description: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    amount: number;
}

export class CreateRefundDto {
    @IsOptional()
    @IsMongoId()
    claimId?: string;

    @IsOptional()
    @IsMongoId()
    disputeId?: string;

    @IsNotEmpty()
    refundDetails: RefundDetailsDto;

    @IsNotEmpty()
    @IsMongoId()
    employeeId: string;

    @IsOptional()
    @IsMongoId()
    financeStaffId?: string;

    @IsOptional()
    @IsEnum(RefundStatus)
    status?: RefundStatus;

    @IsOptional()
    @IsMongoId()
    paidInPayrollRunId?: string;
}