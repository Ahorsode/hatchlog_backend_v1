import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthUser } from '../../auth/auth.types';
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
    const meta = this.reflector.getAllAndOverride<FarmPermissionMeta | undefined>(
      FARM_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) return true;

    const request = context.switchToHttp().getRequest<
      Request & { user?: AuthUser }
    >();
    const user = request.user;
    if (!user) return false;

    const key = meta.farmIdKey || 'farm_id';
    const fromQuery = request.query?.[key];
    const fromBody =
      request.body && typeof request.body === 'object'
        ? (request.body as Record<string, unknown>)[key] ??
          (request.body as Record<string, unknown>).farmId
        : undefined;
    const farmId = String(fromQuery ?? fromBody ?? '').trim();

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
