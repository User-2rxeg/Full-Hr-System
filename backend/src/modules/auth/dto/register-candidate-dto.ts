import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterCandidateDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Jane' })
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'ID123456789' })
  nationalId!: string;

  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'jane.doe@example.com' })
  personalEmail!: string;

  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({ example: 's3cureP@ss' })
  password!: string;


  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: '+250788123456' })
  mobilePhone!: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Ann' })
  middleName?: string;
}

