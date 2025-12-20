import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { EmployeeStatus } from '../../enums/employee-profile.enums';

export class SearchEmployeesDto {
    @IsOptional()
    @IsString()
    query?: string;

    @IsOptional()
    @IsEnum(EmployeeStatus)
    status?: EmployeeStatus;

    @IsOptional()
    @IsMongoId()
    departmentId?: string;

    @IsOptional()
    @IsMongoId()
    positionId?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}

export class PaginationQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

