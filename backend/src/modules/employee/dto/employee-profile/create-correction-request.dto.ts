import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCorrectionRequestDto {
    @IsNotEmpty()
    @IsString()
    requestDescription: string;

    @IsOptional()
    @IsString()
    reason?: string;
}
