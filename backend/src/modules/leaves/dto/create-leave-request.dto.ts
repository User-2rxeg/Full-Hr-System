import {
  IsMongoId,
  IsOptional,
  IsString,
  IsDate,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLeaveRequestDto {
  @IsMongoId()
  employeeId: string;

  @IsMongoId()
  leaveTypeId: string;

  @Type(() => Date)
  @IsDate()
  from: Date;

  @Type(() => Date)
  @IsDate()
  to: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  durationDays?: number; // optional, calculated in service

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @IsMongoId()
  attachmentId?: string;

  @IsOptional()
  @IsBoolean()
  postLeave?: boolean; // matches dto.postLeave in service
}
