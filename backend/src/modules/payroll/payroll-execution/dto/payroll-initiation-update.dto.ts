import { ApiProperty } from '@nestjs/swagger';
export class PayrollInitiationUpdateDto {
  @ApiProperty({ required: false, description: 'Payroll period (ISO date representing period end)' })
  payrollPeriod?: string;

  @ApiProperty({ required: false, description: 'Entity/company name' })
  entity?: string;

  @ApiProperty({ required: false, description: 'Number of employees included in run' })
  employees?: number;

  @ApiProperty({ required: false, description: 'Number of exceptions detected' })
  exceptions?: number;

  @ApiProperty({ required: false, description: 'Total net pay for the run' })
  totalnetpay?: number;

  @ApiProperty({ required: false, description: 'If the run was rejected, an explanation' })
  rejectionReason?: string;
}
