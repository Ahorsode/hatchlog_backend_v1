import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from '../../auth/auth.types';
import { readFarmIdParam } from '../farm-access';
import {
  FARM_PERMISSION_KEY,
  type FarmPermissionMeta,
} from '../decorators/require-farm-permission.decorator';
import { PermissionsService } from '../permissions.service';

@Injectable()
export class FarmPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<
      FarmPermissionMeta | undefined
    >(FARM_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!meta) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      // Prefer an explicit 401 over Nest's generic "Forbidden resource"
      // when this guard accidentally runs before auth.
      throw new UnauthorizedException('Authentication required');
    }

    const key = meta.farmIdKey || 'farm_id';
    const fromQuery = readFarmIdParam(request.query?.[key]);
    const fromBody =
      request.body && typeof request.body === 'object'
        ? readFarmIdParam(
            (request.body as Record<string, unknown>)[key] ??
              (request.body as Record<string, unknown>).farmId,
          )
        : '';
    const farmId = fromQuery || fromBody;

    if (!farmId) {
      throw new BadRequestException(`${key} is required`);
    }

    await this.permissions.assertPermission(
      user,
      farmId,
      meta.module,
      meta.action,
    );
    return true;
  }
}
