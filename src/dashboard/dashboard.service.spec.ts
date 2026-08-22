import { DashboardService } from './dashboard.service';
import type { AuthUser } from '../auth/auth.types';

describe('DashboardService.getMonthlySummary', () => {
  const farmId = 'farm_1';
  const user: AuthUser = {
    id: 'user_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: [farmId],
    supabaseSub: 'sub_1',
  };

  it('returns revenue, expenses, and eggs for the current month', async () => {
    const prisma = {
      sale: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { totalAmount: 1200 },
        }),
      },
      expense: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amount: 300 },
        }),
      },
      eggProduction: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { eggsCollected: 900 },
        }),
      },
    };
    const service = new DashboardService(prisma as any);

    const summary = await service.getMonthlySummary(user, farmId);

    expect(summary).toEqual({
      revenue: 1200,
      expenses: 300,
      eggs: 900,
    });
    expect(prisma.sale.aggregate).toHaveBeenCalled();
    expect(prisma.expense.aggregate).toHaveBeenCalled();
    expect(prisma.eggProduction.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          farmId,
          isDeleted: false,
        }),
      }),
    );
  });

  it('defaults missing aggregates to zero', async () => {
    const prisma = {
      sale: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalAmount: null } }),
      },
      expense: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      },
      eggProduction: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { eggsCollected: null } }),
      },
    };
    const service = new DashboardService(prisma as any);

    await expect(service.getMonthlySummary(user, farmId)).resolves.toEqual({
      revenue: 0,
      expenses: 0,
      eggs: 0,
    });
  });
});

describe('DashboardService.getStats', () => {
  const farmId = 'farm_1';
  const user: AuthUser = {
    id: 'user_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: [farmId],
    supabaseSub: 'sub_1',
  };

  const emptySum = (field: string) => ({ _sum: { [field]: null } });

  function prismaForStats(overrides?: {
    feedTrendRows?: Array<{ logDate: Date; amountConsumed: unknown }>;
    eggTrendRows?: Array<{ logDate: Date; eggsCollected: unknown }>;
    mortalityTrendRows?: Array<{ logDate: Date; count: unknown }>;
  }) {
    return {
      livestock: {
        aggregate: jest.fn().mockResolvedValue(emptySum('currentCount')),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      eggProduction: {
        aggregate: jest.fn().mockResolvedValue(emptySum('eggsCollected')),
        findMany: jest.fn().mockResolvedValue(overrides?.eggTrendRows ?? []),
      },
      healthMortality: {
        aggregate: jest.fn().mockResolvedValue(emptySum('count')),
        findMany: jest
          .fn()
          .mockResolvedValue(overrides?.mortalityTrendRows ?? []),
      },
      feedingLog: {
        findMany: jest.fn().mockResolvedValue(overrides?.feedTrendRows ?? []),
      },
      expense: {
        aggregate: jest.fn().mockResolvedValue(emptySum('amount')),
      },
      order: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { totalAmount: null },
          _count: 0,
        }),
      },
      supplier: {
        aggregate: jest.fn().mockResolvedValue(emptySum('balanceOwed')),
      },
      customer: {
        aggregate: jest.fn().mockResolvedValue(emptySum('balanceOwed')),
      },
      inventory: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
  }

  it('returns zeros for an empty farm', async () => {
    const prisma = prismaForStats();
    const service = new DashboardService(prisma as any);

    const stats = await service.getStats(user, farmId);

    expect(stats.totalBirdCount).toBe(0);
    expect(stats.activeBatches).toBe(0);
    expect(stats.totalEggs).toBe(0);
    expect(stats.todayEggs).toBe(0);
    expect(stats.totalDead).toBe(0);
    expect(stats.todayDead).toBe(0);
    expect(stats.mortalityRate).toBe(0);
    expect(stats.totalExpenses).toBe(0);
    expect(stats.recentOrdersCount).toBe(0);
    expect(stats.activeBatchRows).toEqual([]);
    expect(stats.lowFeedItems).toEqual([]);
    expect(stats.series.eggs.length).toBeGreaterThan(0);
    expect(stats.series.eggs.every((day: { value: number }) => day.value === 0)).toBe(
      true,
    );
  });

  it('ignores invalid log dates instead of throwing', async () => {
    const prisma = prismaForStats({
      feedTrendRows: [
        { logDate: new Date('not-a-date'), amountConsumed: 12 },
        { logDate: new Date('2026-08-20T00:00:00.000Z'), amountConsumed: 3 },
      ],
      eggTrendRows: [{ logDate: new Date('invalid'), eggsCollected: 40 }],
      mortalityTrendRows: [{ logDate: new Date(Number.NaN), count: 2 }],
    });
    const service = new DashboardService(prisma as any);

    await expect(service.getStats(user, farmId)).resolves.toMatchObject({
      totalBirdCount: 0,
      totalEggs: 0,
    });
  });
});
