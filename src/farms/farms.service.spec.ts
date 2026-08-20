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
    const farmCreate = jest.fn().mockResolvedValue({ id: 'farm_1' });
    const prisma = {
      farm: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: farmCreate,
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

    const createCalls = farmCreate.mock.calls as unknown as Array<
      [
        {
          data: {
            subscriptionTier: string;
            masterLicenseStatus: string;
            trialStartedAt: Date;
            trialExpiresAt: Date;
          };
        },
      ]
    >;
    const data = createCalls[0][0].data;
    expect(data.subscriptionTier).toBe('STANDARD');
    expect(data.masterLicenseStatus).toBe('CLOUD_TRIAL');
    expect(
      (data.trialExpiresAt.getTime() - data.trialStartedAt.getTime()) /
        (24 * 60 * 60 * 1000),
    ).toBe(30);
  });

  it('sets trial fields when onboarding a placeholder farm without a clock', async () => {
    const farmUpdate = jest.fn().mockResolvedValue({ id: 'farm_1' });
    const prisma = {
      farm: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'farm_1',
          trialStartedAt: null,
        }),
        update: farmUpdate,
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

    const updateCalls = farmUpdate.mock.calls as unknown as Array<
      [
        {
          data: {
            subscriptionTier: string;
            masterLicenseStatus: string;
          };
        },
      ]
    >;
    const data = updateCalls[0][0].data;
    expect(data.subscriptionTier).toBe('STANDARD');
    expect(data.masterLicenseStatus).toBe('CLOUD_TRIAL');
  });
});
