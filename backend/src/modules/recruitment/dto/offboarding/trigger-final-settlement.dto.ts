import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerFinalSettlementDto {
    @ApiProperty({ description: 'Termination request ID', example: '507f1f77bcf86cd799439011' })
    //@IsMongoId()
    @IsNotEmpty()
    terminationId: string;

    @ApiPropertyOptional({ description: 'Additional notes for final settlement', example: 'Include unused leave encashment' })
    @IsString()
    @IsOptional()
    notes?: string;
}
