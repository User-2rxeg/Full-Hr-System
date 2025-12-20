import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { BlacklistedToken, BlacklistedTokenSchema } from "./token/blacklisted-token.schema";
import { EmployeeModule } from "../employee/employee.module";
import { EmployeeProfile, EmployeeProfileSchema } from "../employee/models/employee/employee-profile.schema";
import { EmployeeSystemRole, EmployeeSystemRoleSchema } from "../employee/models/employee/employee-system-role.schema";
import { Candidate, CandidateSchema } from "../employee/models/employee/Candidate.Schema";
import { AuthService } from "./services/authentication-service";
import { JwtStrategy } from "./token/jwt-strategies";

import { AuthController } from "./controller/auth-controller";
import { AuthorizationGuard } from "./guards/authorization-guard";
import { EmployeeAuthService } from "./services/employee-auth.service";
import {AuthenticationGuard} from "./guards/authentication-guard";

@Module({
    imports: [
        ConfigModule,

        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (cfg: ConfigService) => ({
                secret: cfg.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: cfg.get<string>('JWT_EXPIRES_IN') || '7d' },
            }),
        }),
        MongooseModule.forFeature([
            { name: BlacklistedToken.name, schema: BlacklistedTokenSchema },
            { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
            { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
            { name: Candidate.name, schema: CandidateSchema },
        ]),
        forwardRef(() => EmployeeModule),
    ],
    controllers: [AuthController],
    providers: [AuthService, EmployeeAuthService, JwtStrategy, AuthorizationGuard, AuthenticationGuard],
    exports: [AuthService, EmployeeAuthService, JwtModule, AuthenticationGuard, AuthorizationGuard],
})
export class AuthModule {}
