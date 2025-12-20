import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard as NestAuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public-decorator';
import { AuthService } from '../services/authentication-service';


@Injectable()
export class AuthenticationGuard extends NestAuthGuard('jwt') {
    constructor(
        private readonly reflector: Reflector,
        private readonly auth: AuthService,
    ) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Allow @Public routes
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass(),]);

        if (isPublic) return true;

        try {
            // allow passport to extract token from cookie or Authorization header
            await super.canActivate(context);
        } catch (err) {
            throw err;
        }

        const req = context.switchToHttp().getRequest<Request>();
        const user = (req as any).user;

        if (!user) {
            throw new UnauthorizedException('Unauthorized');
        }

        // Extract and validate token from cookie or Authorization header
        const token = this.extractTokenFromCookie(req) ?? this.extractTokenFromHeader(req);
        if (!token) {
            throw new UnauthorizedException('Missing authentication token');
        }

        // Check if token has been blacklisted (logout)
        const isBlacklisted = await this.auth.isAccessTokenBlacklisted(token);
        if (isBlacklisted) {
            throw new UnauthorizedException('Session expired. Please sign in again.');
        }

        return true;
    }

    private extractTokenFromCookie(request: Request): string | undefined {
        return (request as any).cookies?.access_token;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const auth = (request as any).headers?.authorization as string | undefined;
        if (!auth) return undefined;
        const parts = auth.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') return parts[1];
        return undefined;
    }
}
