import { IsOptional, IsString, IsDateString } from 'class-validator';

export class GenerateReportDto {
    @IsOptional()
    @IsString()
    departmentId?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    reportType?: string; // 'monthly', 'yearly', 'department', 'tax', 'insurance'
}