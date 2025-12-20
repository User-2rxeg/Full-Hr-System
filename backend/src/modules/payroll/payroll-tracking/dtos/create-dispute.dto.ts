import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class CreateDisputeDto {
    @IsNotEmpty()
    @IsString()
    description: string;

    @IsNotEmpty()
    @IsMongoId()
    payslipId: string;
}