import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelOnboardingDto {
    @ApiProperty({ description: 'Reason for cancellation', example: 'No-show on first day' })
    @IsString()
    @IsNotEmpty()
    reason: string;
}

