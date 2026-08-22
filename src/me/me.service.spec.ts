import * as bcrypt from 'bcryptjs';
import { BadRequestException } from '@nestjs/common';
import { MeService } from './me.service';
import { WORKER_PLACEHOLDER_PASSWORD } from '../team/team.constants';
import type { AuthUser } from '../auth/auth.types';

describe('MeService password and identity', () => {
  const farmId = 'farm_1';
  const user: AuthUser = {
    id: 'worker_1',
    email: 'phone.233540000000@users.hatchlog.local',
    phoneNumber: '+233540000000',
    role: 'WORKER',
    farmIds: [farmId],
    supabaseSub: 'sub_1',
  };

  it('passwordBridge looks up 0 and +233 candidates', async () => {
    const passwordHash = await bcrypt.hash(WORKER_PLACEHOLDER_PASSWORD, 10);
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'worker_1',
          email: user.email,
          phoneNumber: '+233540000000',
          password: passwordHash,
          firstname: null,
          surname: null,
          mustChangePassword: true,
        }),
        update: jest.fn(),
      },
    };
    const service = new MeService(
      prisma as any,
      { get: jest.fn() } as any,
      { invalidateUser: jest.fn() } as any,
    );
    jest.spyOn(service, 'ensureSupabaseLogin').mockResolvedValue(undefined as any);

    const result = await service.passwordBridge('0540000000', '123456');

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          phoneNumber: {
            in: expect.arrayContaining(['0540000000', '+233540000000']),
          },
        },
      }),
    );
    expect(result.mustChangePassword).toBe(true);
    expect(result.userId).toBe('worker_1');
  });

  it('rejects 123456 as a new password and clears mustChangePassword on a valid change', async () => {
    const passwordHash = await bcrypt.hash(WORKER_PLACEHOLDER_PASSWORD, 10);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'worker_1',
          email: user.email,
          phoneNumber: '+233540000000',
          password: passwordHash,
          firstname: null,
          surname: null,
          mustChangePassword: true,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new MeService(
      prisma as any,
      { get: jest.fn() } as any,
      { invalidateUser: jest.fn() } as any,
    );
    jest.spyOn(service, 'ensureSupabaseLogin').mockResolvedValue(undefined as any);

    await expect(
      service.updatePassword(user, { new: '123456' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.updatePassword(user, { new: 'farm-safe-pass' }),
    ).resolves.toEqual({ success: true, mustChangePassword: false });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mustChangePassword: false }),
      }),
    );
  });

  it('getProfileByIdentity matches invited phones in either format', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'worker_1' }),
      },
    };
    const service = new MeService(
      prisma as any,
      { get: jest.fn() } as any,
      { invalidateUser: jest.fn() } as any,
    );

    await service.getProfileByIdentity(undefined, '+233540000000');

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
  });
});
