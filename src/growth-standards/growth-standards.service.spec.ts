import { GrowthStandardsService } from './growth-standards.service';

describe('GrowthStandardsService', () => {
  it('maps rows with display name and numeric targets', async () => {
    const prisma = {
      growthStandards: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'gs_1',
            livestockType: 'POULTRY_BROILER',
            ageInDays: 14,
            targetWeight: 0.45,
            targetFeed: 0.8,
            unit: 'kg',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ]),
      },
    };
    const service = new GrowthStandardsService(prisma as any);

    const rows = await service.list('POULTRY_BROILER');

    expect(prisma.growthStandards.findMany).toHaveBeenCalledWith({
      where: { livestockType: 'POULTRY_BROILER' },
      orderBy: [{ livestockType: 'asc' }, { ageInDays: 'asc' }],
    });
    expect(rows).toEqual([
      expect.objectContaining({
        id: 'gs_1',
        name: 'Poultry Broiler @ day 14',
        livestockType: 'POULTRY_BROILER',
        ageInDays: 14,
        targetWeight: 0.45,
        targetFeed: 0.8,
        unit: 'kg',
      }),
    ]);
  });

  it('lists all types when type filter omitted', async () => {
    const prisma = {
      growthStandards: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new GrowthStandardsService(prisma as any);

    await service.list();

    expect(prisma.growthStandards.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ livestockType: 'asc' }, { ageInDays: 'asc' }],
    });
  });
});
