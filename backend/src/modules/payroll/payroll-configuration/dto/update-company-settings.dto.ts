import { IsDateString, IsString, IsOptional } from 'class-validator';

export class UpdateCompanyWideSettingsDto {
  @IsDateString()
  @IsOptional()
  payDate?: Date;

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsString()
  @IsOptional()
  currency?: string;
}
