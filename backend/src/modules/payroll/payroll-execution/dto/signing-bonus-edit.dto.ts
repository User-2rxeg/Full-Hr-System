import { IsOptional, IsString, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BonusStatus } from '../enums/payroll-execution-enum';

export class SigningBonusEditDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiPropertyOptional({ description: 'Monetary amount for the signing bonus', type: 'number', example: 1500 })
  amount?: number;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ description: 'Scheduled payment date (ISO 8601 string)', type: 'string', example: '2025-12-15T00:00:00.000Z' })
  paymentDate?: string;

  @IsOptional()
  @IsEnum(BonusStatus)
  @ApiPropertyOptional({ description: 'Status of the signing bonus', enum: BonusStatus, example: BonusStatus.PENDING })
  status?: BonusStatus;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Optional note or reason for the edit', type: 'string' })
  note?: string;
}
