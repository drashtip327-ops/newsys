import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../modules/auth/auth.service';
import { SettingsService } from '../../modules/settings/settings.service';
import type { RoleRequest } from '../types/auth-request';
import type { PagePermission } from '../../../../shared/access.types';
export const Public = () => SetMetadata('public', true);
export const RequirePage = (page: PagePermission) => SetMetadata('page', page);
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly auth: AuthService, private readonly settings: SettingsService) {}
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<RoleRequest>();
    if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000')) throw new ForbiddenException('This request origin is not allowed.');
    if (this.reflector.getAllAndOverride<boolean>('public', [context.getHandler(), context.getClass()])) return true;
    req.role = this.auth.user(req).role;
    const page = this.reflector.getAllAndOverride<PagePermission>('page', [context.getHandler(), context.getClass()]);
    if (page && !this.settings.get().permissions[req.role][page]) throw new ForbiddenException('Your role does not have permission for this page.');
    return true;
  }
}
