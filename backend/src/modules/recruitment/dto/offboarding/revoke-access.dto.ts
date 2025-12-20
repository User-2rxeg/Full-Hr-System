import { IsMongoId, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RevokeAccessDto {
    @ApiProperty({ description: 'employee ID for access revocation', example: '507f1f77bcf86cd799439011' })
    //@IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @ApiPropertyOptional({ description: 'Notes about access revocation', example: 'All systems access disabled' })
    @IsString()
    @IsOptional()
    notes?: string;
}
