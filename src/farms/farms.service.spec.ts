import { FarmsService } from './farms.service';
import type { AuthUser } from '../auth/auth.types';

describe('FarmsService.onboard', () => {
  const user: AuthUser = {
    id: 'user_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: [],
    supabaseSub: 'sub_1',
  };

  it('starts a 30-day STANDARD trial when creating a farm', async () => {
    const prisma = {
      farm: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'farm_1' }),
      },
      farmMember: { create: jest.fn() },
      farmSettings: { create: jest.fn() },
      user: { update: jest.fn() },
    };
    const service = new FarmsService(prisma as never);

    await service.onboard(user, {
      name: 'Green Farm',
      location: 'Accra',
      capacity: 500,
    });

    const data = prisma.farm.create.mock.calls[0][0].data as {
      subscriptionTier: string;
      masterLicenseStatus: string;
      trialStartedAt: Date;
      trialExpiresAt: Date;
    };
    expect(data.subscriptionTier).toBe('STANDARD');
    expect(data.masterLicenseStatus).toBe('CLOUD_TRIAL');
    expect(
      (data.trialExpiresAt.getTime() - data.trialStartedAt.getTime()) /
        (24 * 60 * 60 * 1000),
    ).toBe(30);
  });

  it('sets trial fields when onboarding a placeholder farm without a clock', async () => {
    const prisma = {
      farm: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'farm_1',
          trialStartedAt: null,
        }),
        update: jest.fn().mockResolvedValue({ id: 'farm_1' }),
      },
      farmMember: { upsert: jest.fn() },
      farmSettings: { upsert: jest.fn() },
      user: { update: jest.fn() },
    };
    const service = new FarmsService(prisma as never);

    await service.onboard(user, {
      name: 'Green Farm',
      location: 'Accra',
      capacity: 500,
    });

    const data = prisma.farm.update.mock.calls[0][0].data as {
      subscriptionTier: string;
      masterLicenseStatus: string;
    };
    expect(data.subscriptionTier).toBe('STANDARD');
    expect(data.masterLicenseStatus).toBe('CLOUD_TRIAL');
  });
});
