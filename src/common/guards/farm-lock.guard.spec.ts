import {
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FarmLockGuard } from './farm-lock.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_WHEN_FARM_LOCKED_KEY } from '../decorators/allow-when-farm-locked.decorator';
import { FARM_ENTITLEMENT_KEY } from '../decorators/require-entitlement.decorator';

describe('FarmLockGuard', () => {
  const farmId = 'farm_1';

  function contextFor(path: string, query: Record<string, string> = { farm_id: farmId }) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          query,
          body: {},
          path,
          url: path,
        }),
      }),
    } as ExecutionContext;
  }

  function buildGuard(opts: {
    farm: Record<string, unknown> | null;
    entitlement?: string;
    allowWhenLocked?: boolean;
  }) {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ALLOW_WHEN_FARM_LOCKED_KEY) return opts.allowWhenLocked ?? false;
        if (key === FARM_ENTITLEMENT_KEY) return opts.entitlement;
        return undefined;
      }),
    };
    const prisma = {
      farm: {
        findUnique: jest.fn().mockResolvedValue(opts.farm),
      },
    };
    return new FarmLockGuard(reflector as unknown as Reflector, prisma as never);
  }

  it('rejects livestock list on a locked unpaid farm', async () => {
    const guard = buildGuard({
      farm: {
        subscriptionTier: 'STANDARD',
        masterLicenseStatus: 'CLOUD_TRIAL',
        trialStartedAt: new Date('2026-06-01T00:00:00.000Z'),
        trialExpiresAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    });

    await expect(guard.canActivate(contextFor('/api/v1/livestock'))).rejects.toEqual(
      expect.objectContaining({
        status: HttpStatus.PAYMENT_REQUIRED,
      }),
    );

    try {
      await guard.canActivate(contextFor('/api/v1/livestock'));
      fail('expected lock');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toMatchObject({
        code: 'FARM_LOCKED',
      });
    }
  });

  it('denies CRM on Standard trial', async () => {
    const guard = buildGuard({
      entitlement: 'CRM',
      farm: {
        subscriptionTier: 'STANDARD',
        masterLicenseStatus: 'CLOUD_TRIAL',
        trialStartedAt: new Date('2026-08-01T00:00:00.000Z'),
        trialExpiresAt: new Date('2026-09-01T00:00:00.000Z'),
      },
    });

    await expect(
      guard.canActivate(contextFor('/api/v1/customers')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows CRM on paid Premium', async () => {
    const guard = buildGuard({
      entitlement: 'CRM',
      farm: {
        subscriptionTier: 'PREMIUM',
        masterLicenseStatus: 'PAID_PREMIUM',
        trialStartedAt: new Date('2026-08-01T00:00:00.000Z'),
        trialExpiresAt: new Date('2027-08-01T00:00:00.000Z'),
      },
    });

    await expect(guard.canActivate(contextFor('/api/v1/customers'))).resolves.toBe(
      true,
    );
  });
});
