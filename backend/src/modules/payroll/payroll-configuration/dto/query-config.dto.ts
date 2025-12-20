import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ConfigStatus } from '../enums/payroll-configuration-enums';

export class QueryConfigDto {
  @IsOptional()
  @IsEnum(ConfigStatus)
  status?: ConfigStatus;

  @IsOptional()
  @IsString()
  createdByEmployeeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;
}

