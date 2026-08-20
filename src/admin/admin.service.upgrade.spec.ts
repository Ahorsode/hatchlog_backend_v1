import { AdminService } from './admin.service';

describe('AdminService.upgradeTier', () => {
  it('unlocks the farm without writing device registrations', async () => {
    const farmUpdate = jest.fn().mockResolvedValue({});
    const eventCreate = jest.fn();
    const deviceUpdateMany = jest.fn();
    const prisma = {
      adminUser: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'admin_1',
          username: 'admin',
        }),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          farm: {
            findUnique: jest.fn().mockResolvedValue({
              userId: 'user_1',
              subscriptionTier: 'STANDARD',
              masterLicenseStatus: 'CLOUD_TRIAL',
              trialExpiresAt: new Date('2026-08-01T00:00:00.000Z'),
            }),
            update: farmUpdate,
          },
          subscriptionEvent: { create: eventCreate },
          deviceRegistration: { updateMany: deviceUpdateMany },
        }),
      ),
    };
    const service = new AdminService(prisma as never);

    await service.upgradeTier('farm_1', {
      adminId: 'admin_1',
      tier: 'PREMIUM',
      durationDays: 365,
    });

    expect(deviceUpdateMany).not.toHaveBeenCalled();
    expect(farmUpdate).toHaveBeenCalled();
    const updateCalls = farmUpdate.mock.calls as unknown as Array<
      [
        {
          where: { id: string };
          data: {
            subscriptionTier: string;
            masterLicenseStatus: string;
          };
        },
      ]
    >;
    const updateArg = updateCalls[0][0];
    expect(updateArg.where).toEqual({ id: 'farm_1' });
    expect(updateArg.data.subscriptionTier).toBe('PREMIUM');
    expect(updateArg.data.masterLicenseStatus).toBe('PAID_PREMIUM');
    expect(eventCreate).toHaveBeenCalled();
  });
});
