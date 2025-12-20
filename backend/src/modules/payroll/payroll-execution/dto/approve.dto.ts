import { IsOptional, IsString } from 'class-validator';

export class PayrollApproveDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
