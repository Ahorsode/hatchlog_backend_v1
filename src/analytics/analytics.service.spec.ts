import { AnalyticsService } from './analytics.service';
import type { AuthUser } from '../auth/auth.types';

describe('AnalyticsService.getBatchAnalytics', () => {
  const farmId = 'farm_1';
  const batchId = 'batch_1';
  const user: AuthUser = {
    id: 'user_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: [farmId],
    supabaseSub: 'sub_1',
  };

  it('uses aggregates instead of loading all feeding and mortality rows', async () => {
    const prisma = {
      livestock: {
        findFirst: jest.fn().mockResolvedValue({
          id: batchId,
          batchName: 'A',
          currentCount: 90,
          initialCount: 100,
        }),
      },
      feedingLog: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amountConsumed: 180 },
        }),
      },
      healthMortality: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { count: 10 },
        }),
      },
      weightRecord: {
        findFirst: jest.fn().mockResolvedValue({ averageWeight: 2 }),
      },
    };
    const service = new AnalyticsService(prisma as any);

    const result = await service.getBatchAnalytics(user, {
      farm_id: farmId,
      batch_id: batchId,
    });

    expect(prisma.feedingLog.aggregate).toHaveBeenCalled();
    expect(prisma.healthMortality.aggregate).toHaveBeenCalled();
    expect(result.totalFeed).toBe(180);
    expect(result.totalDead).toBe(10);
    expect(result.fcr).toBe(1);
  });
});

describe('AnalyticsService.getMortalityTrends', () => {
  const farmId = 'farm_1';
  const user: AuthUser = {
    id: 'user_1',
    email: 'owner@example.com',
    phoneNumber: null,
    role: 'OWNER',
    farmIds: [farmId],
    supabaseSub: 'sub_1',
  };

  it('aggregates mortality by day instead of loading all-time rows', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([
          { day: new Date('2026-08-01T00:00:00Z'), value: 3 },
        ]),
    };
    const service = new AnalyticsService(prisma as any);

    const result = await service.getMortalityTrends(user, farmId);

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(result).toEqual([{ date: '2026-08-01', count: 3 }]);
  });
});
