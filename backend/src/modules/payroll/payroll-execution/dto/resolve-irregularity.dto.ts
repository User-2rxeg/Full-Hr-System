import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveIrregularityDto {
  @ApiProperty({ 
    description: 'Resolution action', 
    enum: ['approved', 'rejected', 'excluded', 'adjusted'],
    example: 'approved' 
  })
  @IsString()
  @IsIn(['approved', 'rejected', 'excluded', 'adjusted'])
  action: 'approved' | 'rejected' | 'excluded' | 'adjusted';

  @ApiProperty({ 
    description: 'Notes explaining the resolution decision',
    example: 'Verified with HR - salary increase approved per promotion letter dated Dec 1'
  })
  @IsString()
  notes: string;

  @ApiPropertyOptional({ 
    description: 'Adjusted value (if action is adjusted)',
    example: 5000
  })
  @IsOptional()
  adjustedValue?: number;
}
