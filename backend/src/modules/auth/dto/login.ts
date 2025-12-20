import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @IsEmail()
    @ApiProperty({ example: 'user@example.com' })
    email!: string;

    @IsNotEmpty()
    @MinLength(6)
    @ApiProperty({ example: 's3cureP@ss' })
    password!: string;
}


