import { IsString, IsNotEmpty, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class AddEmergencyContactDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    relationship: string;

    @IsNotEmpty()
    @IsString()
    phone: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;
}

export class UpdateEmergencyContactDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    relationship?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;
}
