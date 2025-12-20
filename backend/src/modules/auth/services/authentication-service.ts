import {
    Injectable,
    UnauthorizedException,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';


import { EmployeeAuthService } from './employee-auth.service';

import { BlacklistedToken, BlackListedTokenDocument } from '../token/blacklisted-token.schema';
import { SystemRole } from '../../employee/enums/employee-profile.enums';
import { RegisterEmployeeDto } from "../dto/register-employee-dto";
import { RegisterCandidateDto } from "../dto/register-candidate-dto";

type SafeEmployee = {
    _id: string;
    email: string;
    roles: SystemRole[];
    employeeNumber: string;
    firstName: string;
    lastName: string;
};

type SafeCandidate = {
    _id: string;
    email: string;
    candidateNumber: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    mobilePhone?: string;
    applicationDate?: Date;
};

@Injectable()
export class AuthService {
    constructor(
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly jwtService: JwtService,
        @InjectModel(BlacklistedToken.name) private readonly blacklistModel: Model<BlackListedTokenDocument>,

    ) {
    }

    private toSafeEmployee(doc: any, roles: SystemRole[]): SafeEmployee {
        const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
        return {
            _id: String(obj._id),
            email: obj.workEmail || obj.personalEmail,
            roles,
            employeeNumber: obj.employeeNumber,
            firstName: obj.firstName,
            lastName: obj.lastName,
        };
    }

    private toSafeCandidate(doc: any): SafeCandidate {
        const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
        return {
            _id: String(obj._id),
            email: obj.personalEmail,
            candidateNumber: obj.candidateNumber,
            firstName: obj.firstName,
            lastName: obj.lastName,
        };
    }

    async registerEmployee(dto: RegisterEmployeeDto) {
        const employee = await this.employeeAuthService.createEmployee(dto);
        const roles = dto.roles || [SystemRole.DEPARTMENT_EMPLOYEE];

        return {
            message: 'employee registered successfully',
            employee: this.toSafeEmployee(employee, roles),
        };
    }

    async registerCandidate(dto: RegisterCandidateDto) {
        const candidate = await this.employeeAuthService.createCandidate(dto);

        return {
            message: 'Candidate registered successfully',
            candidate: this.toSafeCandidate(candidate),
        };
    }

    async login(email: string, plainPassword: string) {
        // Try to login as employee first (using workEmail)
        try {
            const { employee, roles } = await this.employeeAuthService.validateEmployeeCredentials(email, plainPassword);

            const payload = {
                sub: String(employee._id),
                email: employee.workEmail!,
                roles,
                userType: 'employee' as const
            };
            const access_token = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

            return {
                access_token,
                user: this.toSafeEmployee(employee, roles),
                userType: 'employee'
            };
        } catch (employeeError) {
            console.error('Employee Login Failed:', employeeError);
            // If employee login fails, try candidate login (using personalEmail)
            try {
                const candidate = await this.employeeAuthService.validateCandidateCredentials(email, plainPassword);

                const payload = {
                    sub: String(candidate._id),
                    email: candidate.personalEmail!,
                    roles: [SystemRole.JOB_CANDIDATE],
                    userType: 'candidate' as const
                };
                const access_token = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

                return {
                    access_token,
                    user: this.toSafeCandidate(candidate),
                    userType: 'candidate'
                };
            } catch (candidateError) {
                console.error('Candidate Login Failed:', candidateError);
                throw new UnauthorizedException('Invalid credentials');
            }
        }
    }

    async getCookieWithJwtToken(token: string) {
        return `access_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }

    async getCookieForLogout() {
        return `access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
    }

    async logout(token: string) {
        if (!token) throw new BadRequestException('No token provided');

        // verify signature & expiry (trusted)
        let decoded: any;
        try {
            decoded = await this.jwtService.verifyAsync(token);
        } catch {
            // invalid or already expired -> no-op (logout success)
            return { message: 'Logout successful' };
        }

        try {
            await this.blacklistModel.create({
                token,
                expiresAt: new Date(decoded.exp * 1000),
            });
        } catch (err: any) {
            if (err.code !== 11000) throw err; // ignore duplicate-key
        }

        return { message: 'Logout successful' };
    }

    async isAccessTokenBlacklisted(token: string) {
        const hit = await this.blacklistModel.findOne({ token }).select('_id').lean();
        return !!hit;
    }

    // HR Admin function to reset employee passwords
}

