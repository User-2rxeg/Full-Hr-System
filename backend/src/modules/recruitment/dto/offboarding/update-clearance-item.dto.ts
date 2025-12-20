import { IsEnum, IsString, IsOptional, IsMongoId, IsDateString } from 'class-validator';
import { ApprovalStatus } from '../../enums/approval-status.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClearanceItemDto {
    @ApiProperty({ description: 'Department name', example: 'IT' })
    @IsString()
    department: string;

    @ApiProperty({ enum: ApprovalStatus, description: 'Clearance approval status' })
    @IsEnum(ApprovalStatus)
    status: ApprovalStatus;

    @ApiPropertyOptional({ description: 'Comments from department', example: 'All assets returned' })
    @IsString()
    @IsOptional()
    comments?: string;

    @ApiProperty({ description: 'User ID who is updating', example: '507f1f77bcf86cd799439011' })
    //@IsMongoId()
    updatedBy: string;

    @ApiPropertyOptional({ description: 'Update timestamp', example: '2025-12-15T10:30:00.000Z' })
    @IsDateString()
    @IsOptional()
    updatedAt?: string;
}
