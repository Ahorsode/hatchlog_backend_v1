import { SubscriptionsService } from './subscriptions.service';
import type { AuthUser } from '../auth/auth.types';

describe('SubscriptionsService.getStatus', () => {
  const farmId = 'farm_1';
  const user: AuthUser = {
    id: 'user_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: [farmId],
    supabaseSub: 'sub_1',
  };

  it('returns remaining days from the farm clock', async () => {
    const now = new Date();
    const prisma = {
      farm: {
        findUnique: jest.fn().mockResolvedValue({
          subscriptionTier: 'STANDARD',
          masterLicenseStatus: 'CLOUD_TRIAL',
          trialStartedAt: now,
          trialExpiresAt: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
        }),
      },
    };
    const service = new SubscriptionsService(prisma as never);

    const status = await service.getStatus(user, farmId);

    expect(status.status).toBe('trial');
    expect(status.remainingDays).toBe(11);
    expect(status.entitlements).not.toContain('CRM');
  });
});
