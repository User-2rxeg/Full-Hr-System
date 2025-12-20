import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateBioDto {
    @IsOptional()
    @IsString()
    biography?: string;

    @IsOptional()
    @IsString()  // Changed from @IsUrl() to support base64 data URLs
    profilePictureUrl?: string;
}
