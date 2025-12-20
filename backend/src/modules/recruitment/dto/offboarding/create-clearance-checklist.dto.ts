import {
    IsMongoId,
    IsNotEmpty,
    IsArray,
    IsOptional,
    ValidateNested,
    IsString,
    IsBoolean,
    IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClearanceItemDto {
    @ApiProperty({ description: 'Department name', example: 'IT' })
    @IsString()
    @IsNotEmpty()
    department: string;

    @ApiPropertyOptional({ description: 'Comments from department', example: 'Laptop returned in good condition' })
    @IsString()
    @IsOptional()
    comments?: string;

    @ApiPropertyOptional({ description: 'User ID who updated this item', example: '507f1f77bcf86cd799439011' })
    //@IsMongoId()
    @IsOptional()
    updatedBy?: string;

    // @ApiPropertyOptional({ description: 'Update timestamp', example: '2025-12-15T10:30:00.000Z' })
    // @IsDateString()
    // @IsOptional()
    // updatedAt?: string;
}

export class EquipmentItemDto {
    @ApiPropertyOptional({ description: 'Equipment ID', example: '507f1f77bcf86cd799439011' })
    //@IsMongoId()
    @IsOptional()
    equipmentId?: string;

    @ApiProperty({ description: 'Equipment name', example: 'Laptop Dell XPS 15' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Whether equipment is returned', example: false })
    @IsBoolean()
    returned: boolean;

    @ApiPropertyOptional({ description: 'Equipment condition', example: 'Good' })
    @IsString()
    @IsOptional()
    condition?: string;
}

export class CreateClearanceChecklistDto {
    @ApiProperty({ description: 'Termination request ID', example: '507f1f77bcf86cd799439011' })
    //@IsMongoId()
    @IsNotEmpty()
    terminationId: string;

    @ApiPropertyOptional({ description: 'List of clearance items by department', type: [ClearanceItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ClearanceItemDto)
    @IsOptional()
    items?: ClearanceItemDto[];

    @ApiPropertyOptional({ description: 'List of equipment to be returned', type: [EquipmentItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EquipmentItemDto)
    @IsOptional()
    equipmentList?: EquipmentItemDto[];

    @ApiPropertyOptional({ description: 'Whether access card is returned', example: false })
    @IsBoolean()
    @IsOptional()
    cardReturned?: boolean;
}
