import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ConfigStatus } from '../enums/payroll-configuration-enums';

export class ApproveConfigDto {
  @IsString()
  @IsNotEmpty()
  approvedBy: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

