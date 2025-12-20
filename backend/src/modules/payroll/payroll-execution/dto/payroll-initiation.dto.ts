import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean, IsEnum, IsDateString } from 'class-validator';

export enum PayrollRunType {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export class PayrollInitiationDto {
  @IsString()
  @IsNotEmpty()
  payrollAreaId!: string;

  @IsDateString()
  @IsNotEmpty()
  periodStart!: string;

  @IsDateString()
  @IsNotEmpty()
  periodEnd!: string;

  @IsEnum(PayrollRunType)
  @IsOptional()
  runType?: PayrollRunType = PayrollRunType.AUTO;

  @IsArray()
  @IsOptional()
  employeeIds?: string[];

  @IsBoolean()
  @IsOptional()
  dryRun?: boolean = false;
}
