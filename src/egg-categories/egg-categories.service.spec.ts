import { NotFoundException } from '@nestjs/common';
import { EggCategoriesService } from './egg-categories.service';
import type { AuthUser } from '../auth/auth.types';

describe('EggCategoriesService', () => {
  const farmId = 'farm_1';
  const user: AuthUser = {
    id: 'user_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: [farmId],
    supabaseSub: 'sub_1',
  };

  function makeService(prisma: Record<string, any>) {
    return new EggCategoriesService(prisma as any);
  }

  it('creates category with sellingPrice, unitSize, isStockInternal', async () => {
    const created = {
      id: 'cat_1',
      farmId,
      name: 'Large',
      description: 'Large eggs',
      sellingPrice: 45,
      unitSize: 30,
      isStockInternal: true,
    };
    const prisma = {
      eggCategory: {
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const service = makeService(prisma);

    const result = await service.create(user, {
      farm_id: farmId,
      name: 'Large',
      description: 'Large eggs',
      sellingPrice: 45,
      unitSize: 30,
      isStockInternal: true,
    });

    expect(prisma.eggCategory.create).toHaveBeenCalledWith({
      data: {
        farmId,
        name: 'Large',
        description: 'Large eggs',
        sellingPrice: 45,
        unitSize: 30,
        isStockInternal: true,
      },
    });
    expect(result).toEqual(created);
  });

  it('updates category fields', async () => {
    const existing = {
      id: 'cat_1',
      farmId,
      name: 'Large',
      description: null,
      sellingPrice: 40,
      unitSize: 30,
      isStockInternal: true,
    };
    const prisma = {
      eggCategory: {
        findUnique: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue({
          ...existing,
          sellingPrice: 50,
          name: 'XL',
        }),
      },
    };
    const service = makeService(prisma);

    await service.update(user, 'cat_1', {
      farm_id: farmId,
      name: 'XL',
      sellingPrice: 50,
    });

    expect(prisma.eggCategory.update).toHaveBeenCalledWith({
      where: { id: 'cat_1' },
      data: {
        name: 'XL',
        sellingPrice: 50,
      },
    });
  });

  it('deletes category for farm', async () => {
    const prisma = {
      eggCategory: {
        findFirst: jest.fn().mockResolvedValue({ id: 'cat_1', farmId }),
        delete: jest.fn().mockResolvedValue({ id: 'cat_1' }),
      },
    };
    const service = makeService(prisma);

    await expect(service.remove(user, 'cat_1', farmId)).resolves.toEqual({
      success: true,
    });
    expect(prisma.eggCategory.delete).toHaveBeenCalledWith({
      where: { id: 'cat_1' },
    });
  });

  it('throws when deleting missing category', async () => {
    const service = makeService({
      eggCategory: {
        findFirst: jest.fn().mockResolvedValue(null),
        delete: jest.fn(),
      },
    });

    await expect(
      service.remove(user, 'missing', farmId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
