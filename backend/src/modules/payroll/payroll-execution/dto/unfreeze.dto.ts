import { IsString, IsNotEmpty } from 'class-validator';

export class PayrollUnfreezeDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
