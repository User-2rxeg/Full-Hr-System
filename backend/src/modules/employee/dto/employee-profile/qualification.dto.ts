import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { GraduationType } from '../../enums/employee-profile.enums';

export class AddQualificationDto {
    @IsString()
    @IsNotEmpty()
    establishmentName: string;

    @IsEnum(GraduationType)
    @IsNotEmpty()
    graduationType: GraduationType;
}

export class UpdateQualificationDto {
    @IsString()
    @IsNotEmpty()
    establishmentName: string;

    @IsEnum(GraduationType)
    @IsNotEmpty()
    graduationType: GraduationType;
}
