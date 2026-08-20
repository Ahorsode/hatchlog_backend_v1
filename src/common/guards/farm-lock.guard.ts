import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_WHEN_FARM_LOCKED_KEY } from '../decorators/allow-when-farm-locked.decorator';
import { FARM_ENTITLEMENT_KEY } from '../decorators/require-entitlement.decorator';
import type { AuthUser } from '../../auth/auth.types';
import { readFarmIdParam } from '../farm-access';
import { PrismaService } from '../../prisma/prisma.service';
import {
  hasEntitlement,
  resolveFarmAccess,
  type FarmEntitlement,
} from '../../subscriptions/farm-access-status';

@Injectable()
export class FarmLockGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowWhenLocked = this.reflector.getAllAndOverride<boolean>(
      ALLOW_WHEN_FARM_LOCKED_KEY,
      [context.getHandler(), context.getClass()],
    );
    const entitlement = this.reflector.getAllAndOverride<
      FarmEntitlement | undefined
    >(FARM_ENTITLEMENT_KEY, [context.getHandler(), context.getClass()]);

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const farmId = this.extractFarmId(request);
    if (!farmId) return true;

    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: {
        subscriptionTier: true,
        masterLicenseStatus: true,
        trialStartedAt: true,
        trialExpiresAt: true,
      },
    });
    if (!farm) return true;

    const access = resolveFarmAccess(farm);

    if (access.status === 'locked' && !allowWhenLocked) {
      throw new HttpException(
        {
          code: 'FARM_LOCKED',
          message:
            'This farm trial has ended. Request an upgrade to restore access.',
          remainingDays: 0,
          periodEndsAt: access.periodEndsAt,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (entitlement && !hasEntitlement(access, entitlement)) {
      throw new ForbiddenException({
        code: 'ENTITLEMENT_REQUIRED',
        entitlement,
        currentPlan: access.tier,
        status: access.status,
        message: `${entitlement} requires the Premium plan`,
      });
    }

    return true;
  }

  private extractFarmId(request: Request): string {
    const fromQuery = readFarmIdParam(request.query?.farm_id);
    if (fromQuery) return fromQuery;

    const fromBody =
      request.body && typeof request.body === 'object'
        ? readFarmIdParam(
            (request.body as Record<string, unknown>).farm_id ??
              (request.body as Record<string, unknown>).farmId,
          )
        : '';
    if (fromBody) return fromBody;

    const path = request.path || request.url || '';
    const farmPath = path.match(/\/api\/v1\/farms\/([^/?]+)/);
    if (farmPath?.[1] && farmPath[1] !== 'onboard') {
      return farmPath[1];
    }
    return '';
  }
}
