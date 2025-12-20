import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsOptional,
  Min,
} from 'class-validator';

export class HierarchyQueryDto {
  @IsOptional()
  @IsMongoId()
  rootDepartmentId?: string;

  @IsOptional()
  @IsMongoId()
  rootPositionId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  depth?: number;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}

