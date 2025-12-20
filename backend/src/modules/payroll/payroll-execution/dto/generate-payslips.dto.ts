import { IsBoolean, IsOptional, IsArray, IsString } from 'class-validator';

export class GeneratePayslipsDto {
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean = true;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  formats?: string[]; // e.g. ['pdf', 'csv']
}
