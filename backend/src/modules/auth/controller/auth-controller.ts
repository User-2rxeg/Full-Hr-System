import {Controller, Post, Body, HttpCode, HttpStatus, Req, Res, UseGuards, InternalServerErrorException, BadRequestException, Patch, Param, HttpException,} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../decorators/public-decorator'; 
import { Roles } from '../decorators/roles-decorator';
import { AuthService } from '../services/authentication-service';

import { AuthenticationGuard} from '../guards/authentication-guard';
import { AuthorizationGuard } from '../guards/authorization-guard';
import { SystemRole } from '../../employee/enums/employee-profile.enums';
import {RegisterEmployeeDto} from "../dto/register-employee-dto";
import {RegisterCandidateDto} from "../dto/register-candidate-dto";
import {LoginDto} from "../dto/login";
import { ApiTags, ApiBody, ApiOperation, ApiConsumes } from '@nestjs/swagger';


@Controller('auth')
@ApiTags('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) {}

   // @UseGuards(AuthenticationGuard, AuthorizationGuard)
    //@Roles(SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN)
    @Post('register-employee')
    @ApiConsumes('application/json')
    @ApiBody({ type: RegisterEmployeeDto })
    @ApiOperation({ summary: 'Register a new employee (admin only)' })
    async registerEmployee(@Body() dto: RegisterEmployeeDto) {
        try {
            return await this.auth.registerEmployee(dto);
        } catch (e) {
            console.error('Employee registration error:', e);
            // Re-throw HTTP exceptions (BadRequest, Unauthorized, Forbidden, etc.)
            if (e instanceof HttpException) {
                throw e;
            }
            throw new InternalServerErrorException(e.message || 'Something went wrong during employee registration.');
        }
    }

    @Public()
    @Post('register-candidate')
    @ApiConsumes('application/json')
    @ApiBody({ type: RegisterCandidateDto })
    @ApiOperation({ summary: 'Register a new candidate (public)' })
    async registerCandidate(@Body() dto: RegisterCandidateDto) {
        try {
            return await this.auth.registerCandidate(dto);
        } catch (e) {
            console.error('Candidate registration error:', e);
            if (e instanceof BadRequestException) {
                throw e;
            }
            throw new InternalServerErrorException(e.message || 'Something went wrong during candidate registration.');
        }
    }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('login')
    @ApiConsumes('application/json')
    @ApiBody({ type: LoginDto })
    @ApiOperation({ summary: 'Login (returns cookie-set JWT)' })
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.auth.login(dto.email, dto.password);
        const cookie = await this.auth.getCookieWithJwtToken(result.access_token);
        res.setHeader('Set-Cookie', cookie);
        const responseBody: any = {
            message: 'Login successful',
            user: result.user,
            userType: result.userType,
            expiresIn: '7d'
        };
        // For local testing convenience, optionally expose the raw access token in the response body
        if (process.env.EXPOSE_JWT_ON_LOGIN === 'true' || process.env.NODE_ENV !== 'production') {
            responseBody.access_token = result.access_token;
        }
        return responseBody;
    }

    @UseGuards(AuthenticationGuard)
    @HttpCode(HttpStatus.OK)
    @Post('logout')
    async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
        const token = req.cookies?.access_token;
        if (token) {
            await this.auth.logout(token);
        }
        const cookie = await this.auth.getCookieForLogout();
        res.setHeader('Set-Cookie', cookie);
        return { message: 'Logout successful' };
    }


}

