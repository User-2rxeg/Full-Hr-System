import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateClaimDto {
    @IsNotEmpty()
    @IsString()
    description: string;

    @IsNotEmpty()
    @IsString()
    claimType: string;

    @IsNotEmpty()
    @IsNumber()
    amount: number;
}