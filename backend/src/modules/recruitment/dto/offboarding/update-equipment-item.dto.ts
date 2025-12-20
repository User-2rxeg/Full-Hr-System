import { IsString, IsBoolean, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEquipmentItemDto {
    @ApiPropertyOptional({ description: 'Equipment ID', example: '507f1f77bcf86cd799439011' })
    //@IsMongoId()
    @IsOptional()
    equipmentId?: string;

    @ApiProperty({ description: 'Equipment name', example: 'Laptop Dell XPS 15' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Whether equipment is returned', example: true })
    @IsBoolean()
    returned: boolean;

    @ApiPropertyOptional({ description: 'Equipment condition', example: 'Good' })
    @IsString()
    @IsOptional()
    condition?: string;
}
