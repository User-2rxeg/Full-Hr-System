import { IsDateString, IsEmail, IsEnum, IsMongoId, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ContractType, EmployeeStatus, Gender, MaritalStatus, WorkType } from '../../enums/employee-profile.enums';

class AddressDto {
    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    streetAddress?: string;

    @IsOptional()
    @IsString()
    country?: string;
}

export class AdminUpdateProfileDto {
    // Personal Information (BR 2a-r)
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    middleName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsString()
    nationalId?: string;

    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender;

    @IsOptional()
    @IsEnum(MaritalStatus)
    maritalStatus?: MaritalStatus;

    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    // Contact Information (BR 2g, 2n, 2o)
    @IsOptional()
    @IsEmail()
    personalEmail?: string;

    @IsOptional()
    @IsString()
    mobilePhone?: string;

    @IsOptional()
    @IsString()
    homePhone?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    address?: AddressDto;

    // Profile
    @IsOptional()
    @IsString()
    biography?: string;

    @IsOptional()
    @IsUrl()
    profilePictureUrl?: string;

    // Organization Structure Links
    @IsOptional()
    @IsMongoId()
    primaryPositionId?: string;

    @IsOptional()
    @IsMongoId()
    primaryDepartmentId?: string;

    @IsOptional()
    @IsMongoId()
    supervisorPositionId?: string;

    @IsOptional()
    @IsMongoId()
    payGradeId?: string;

    // Employment Status (BR 3j)
    @IsOptional()
    @IsEnum(EmployeeStatus)
    status?: EmployeeStatus;

    // Contract Information (BR 3f, 3g)
    @IsOptional()
    @IsEnum(ContractType)
    contractType?: ContractType;

    @IsOptional()
    @IsEnum(WorkType)
    workType?: WorkType;

    @IsOptional()
    @IsDateString()
    dateOfHire?: string;

    @IsOptional()
    @IsDateString()
    contractStartDate?: string;

    @IsOptional()
    @IsDateString()
    contractEndDate?: string;

    @IsOptional()
    @IsString()
    workEmail?: string;

    // Banking Details
    @IsOptional()
    @IsString()
    bankName?: string;

    @IsOptional()
    @IsString()
    bankAccountNumber?: string;
}
