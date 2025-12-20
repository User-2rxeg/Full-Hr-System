import { ApiProperty } from '@nestjs/swagger';
import { BenefitStatus } from '../enums/payroll-execution-enum';

export class TerminationBenefitEditDto {
  @ApiProperty({ description: 'Manually set amount given for this benefit', required: false })
  givenAmount?: number;

  @ApiProperty({ enum: BenefitStatus, description: 'Updated status for the benefit', required: false })
  status?: BenefitStatus;

  @ApiProperty({ description: 'Optional note explaining the edit', required: false })
  note?: string;
}
