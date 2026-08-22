import * as bcrypt from 'bcryptjs';
import { TeamService } from './team.service';
import type { AuthUser } from '../auth/auth.types';
import { WORKER_PLACEHOLDER_PASSWORD } from './team.constants';

describe('TeamService.createInvitation', () => {
  const farmId = 'farm_1';
  const owner: AuthUser = {
    id: 'owner_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: [farmId],
    supabaseSub: 'sub_1',
  };

  const trialFarm = {
    userId: owner.id,
    subscriptionTier: 'STANDARD',
    masterLicenseStatus: 'CLOUD_TRIAL',
    trialStartedAt: new Date(),
    trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };

  function buildPrisma() {
    const client = {
      farm: {
        findUnique: jest.fn().mockResolvedValue(trialFarm),
        create: jest.fn(),
      },
      farmMember: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'mem_1' }),
      },
      invitation: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'inv_1', ...data }),
        ),
        update: jest.fn(),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'worker_1', ...data }),
        ),
      },
      userPermission: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((fn: (tx: typeof client) => unknown) =>
        fn(client),
      ),
    };
    return client;
  }

  it('creates a worker with 123456 and canonical +233 phone', async () => {
    const prisma = buildPrisma();
    const meService = {
      ensureSupabaseLogin: jest.fn().mockResolvedValue(undefined),
    };
    const authCache = { invalidateUser: jest.fn() };
    const service = new TeamService(prisma as any, authCache as any, meService as any);

    const result = await service.createInvitation(owner, {
      farm_id: farmId,
      phoneNumber: '0540000000',
      role: 'WORKER',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phoneNumber: '+233540000000',
          role: 'WORKER',
          mustChangePassword: true,
        }),
      }),
    );
    const created = (prisma.user.create as jest.Mock).mock.calls[0][0].data;
    expect(
      await bcrypt.compare(WORKER_PLACEHOLDER_PASSWORD, created.password),
    ).toBe(true);
    expect(prisma.farm.create).not.toHaveBeenCalled();
    expect(prisma.farmMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          farmId,
          userId: 'worker_1',
          role: 'WORKER',
        }),
      }),
    );
    expect(meService.ensureSupabaseLogin).toHaveBeenCalled();
    expect(result.status).toBe('ACCEPTED');
    expect(result.mustChangePassword).toBe(true);
    expect(result.createdUser).toBe(true);
  });

  it('treats +233 as the same worker phone', async () => {
    const prisma = buildPrisma();
    const meService = {
      ensureSupabaseLogin: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TeamService(
      prisma as any,
      { invalidateUser: jest.fn() } as any,
      meService as any,
    );

    await service.createInvitation(owner, {
      farm_id: farmId,
      phoneNumber: '+233540000000',
      role: 'WORKER',
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            {
              phoneNumber: {
                in: expect.arrayContaining(['+233540000000', '0540000000']),
              },
            },
          ],
        },
      }),
    );
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phoneNumber: '+233540000000' }),
      }),
    );
  });

  it('adds an existing invited phone to the farm without resetting password or creating a farm', async () => {
    const prisma = buildPrisma();
    prisma.user.findFirst.mockResolvedValue({
      id: 'worker_1',
      email: 'phone.233540000000@users.hatchlog.local',
      phoneNumber: '+233540000000',
      mustChangePassword: false,
      firstname: 'Ama',
      surname: 'Mensah',
    });
    const meService = {
      ensureSupabaseLogin: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TeamService(
      prisma as any,
      { invalidateUser: jest.fn() } as any,
      meService as any,
    );

    const result = await service.createInvitation(owner, {
      farm_id: farmId,
      phoneNumber: '+233540000000',
      role: 'WORKER',
    });

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(meService.ensureSupabaseLogin).not.toHaveBeenCalled();
    expect(prisma.farmMember.upsert).toHaveBeenCalled();
    expect(result.createdUser).toBe(false);
    expect(result.mustChangePassword).toBe(false);
  });

  it('rejects inviting a phone that is already a member', async () => {
    const prisma = buildPrisma();
    prisma.user.findFirst.mockResolvedValue({ id: 'worker_1' });
    prisma.farmMember.findUnique.mockResolvedValue({ id: 'mem_1' });
    const service = new TeamService(
      prisma as any,
      { invalidateUser: jest.fn() } as any,
      { ensureSupabaseLogin: jest.fn() } as any,
    );

    await expect(
      service.createInvitation(owner, {
        farm_id: farmId,
        phoneNumber: '0540000000',
        role: 'WORKER',
      }),
    ).rejects.toThrow('already a farm member');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
