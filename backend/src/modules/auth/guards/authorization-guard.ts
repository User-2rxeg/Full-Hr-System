import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '../../employee/enums/employee-profile.enums';
import {ROLES_KEY} from "../decorators/roles-decorator";


@Injectable()
export class AuthorizationGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (!requiredRoles) return true;

        const req = context.switchToHttp().getRequest();
        const user = req.user as { roles?: SystemRole[] } | undefined;
        // Check if user has at least one of the required roles
        return !!user?.roles && user.roles.some(role => requiredRoles.includes(role));
    }
}
