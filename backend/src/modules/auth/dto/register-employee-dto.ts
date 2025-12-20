import { IsEmail, IsNotEmpty, IsString, MinLength, IsDateString, IsArray, IsEnum, IsOptional } from 'class-validator';
import { SystemRole } from '../../employee/enums/employee-profile.enums';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterEmployeeDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'John' })
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Smith' })
  lastName!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'ID987654321' })
  nationalId!: string;

  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'john.smith@company.com' })
  workEmail!: string;

  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({ example: 'initialP@ss1' })
  password!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'EMP-0001' })
  employeeNumber!: string;

  @IsNotEmpty()
  @IsDateString()
  @ApiProperty({ example: '2025-12-01T00:00:00.000Z' })
  dateOfHire!: string;

  @IsArray()
  @IsEnum(SystemRole, { each: true })
  @Type(() => String)
  @ApiProperty({ isArray: true, enum: SystemRole, example: [SystemRole.HR_MANAGER] })
  roles!: SystemRole[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Middle' })
  middleName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '+250788123456' })
  mobilePhone?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'john.personal@example.com' })
  personalEmail?: string;
}

