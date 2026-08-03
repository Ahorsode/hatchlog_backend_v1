import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import type { AuthUser } from '../auth/auth.types';

describe('SuppliersService', () => {
  const farmId = 'farm_1';
  const user: AuthUser = {
    id: 'user_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: [farmId],
    supabaseSub: 'sub_1',
  };

  const existing = {
    id: 'sup_1',
    farmId,
    name: 'Feed Co',
    phone: '0550000000',
    email: 'feed@example.com',
    address: 'Accra',
    balanceOwed: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function makeService(prisma: Record<string, any>) {
    return new SuppliersService(prisma as any);
  }

  it('updates supplier profile fields via PATCH body (not balance increment)', async () => {
    const prisma = {
      supplier: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue({
          ...existing,
          name: 'New Name',
          phone: '0240000000',
          balanceOwed: 10,
        }),
      },
    };
    const service = makeService(prisma);

    const result = await service.update(user, 'sup_1', {
      farm_id: farmId,
      name: 'New Name',
      phone: '0240000000',
    });

    expect(prisma.supplier.update).toHaveBeenCalledWith({
      where: { id: 'sup_1' },
      data: {
        name: 'New Name',
        phone: '0240000000',
      },
    });
    expect(result.name).toBe('New Name');
    expect(result.balanceOwed).toBe(10);
  });

  it('increments balance via updateBalance', async () => {
    const prisma = {
      supplier: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue({ ...existing, balanceOwed: 25 }),
      },
    };
    const service = makeService(prisma);

    const result = await service.updateBalance(user, 'sup_1', {
      farm_id: farmId,
      amount: 15,
    });

    expect(prisma.supplier.update).toHaveBeenCalledWith({
      where: { id: 'sup_1' },
      data: { balanceOwed: { increment: 15 } },
    });
    expect(result).toEqual({ success: true });
  });

  it('rejects profile update when farm is not accessible', async () => {
    const service = makeService({
      supplier: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    });

    await expect(
      service.update(user, 'sup_1', {
        farm_id: 'other_farm',
        name: 'Nope',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getById throws when supplier missing', async () => {
    const service = makeService({
      supplier: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.getById(user, 'missing', farmId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
