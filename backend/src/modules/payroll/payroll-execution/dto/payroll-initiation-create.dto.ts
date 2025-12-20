import { ApiProperty } from '@nestjs/swagger';
export class PayrollInitiationCreateDto {
  @ApiProperty({ required: false, description: 'Optional run id. If omitted server will generate.' })
  runId?: string;

  @ApiProperty({ description: 'Payroll period (ISO date representing period end)' })
  payrollPeriod: string;

  @ApiProperty({ description: 'Entity/department name' })
  entity: string;

  @ApiProperty({ required: false, description: 'Entity/department ID for filtering employees' })
  entityId?: string;

  @ApiProperty({ required: false, description: 'Number of employees (estimated, actual count determined during processing)' })
  employees?: number;

  @ApiProperty({ required: false, description: 'Number of exceptions (calculated during processing)' })
  exceptions?: number;

  @ApiProperty({ required: false, description: 'Total net pay (calculated during processing)' })
  totalnetpay?: number;
}
