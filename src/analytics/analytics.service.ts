import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import type { BatchAnalyticsQueryDto } from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBatchAnalytics(user: AuthUser, query: BatchAnalyticsQueryDto) {
    assertFarmAccess(user, query.farm_id);
    const farmId = query.farm_id;
    const batchId = query.batch_id;

    const batch = await this.prisma.livestock.findFirst({
      where: { id: batchId, farmId },
      include: {
        feedingLogs: {
          where: { isDeleted: false },
          select: { amountConsumed: true },
        },
        weightRecords: {
          orderBy: { logDate: 'desc' },
          take: 1,
          select: { averageWeight: true },
        },
        mortalityRecords: {
          where: { type: 'DEAD', isDeleted: false },
          select: { count: true },
        },
      },
    });

    if (!batch) throw new NotFoundException('Batch not found');

    const totalFeed = batch.feedingLogs.reduce(
      (sum, log) => sum + Number(log.amountConsumed),
      0,
    );
    const currentWeight = Number(
      batch.weightRecords[0]?.averageWeight || 0,
    );
    const currentBirds = batch.currentCount;
    const totalDead = batch.mortalityRecords.reduce(
      (sum, log) => sum + log.count,
      0,
    );

    const fcr =
      currentWeight > 0 && currentBirds > 0
        ? totalFeed / (currentBirds * currentWeight)
        : 0;

    const mortalityRate =
      batch.initialCount > 0
        ? ((batch.initialCount - batch.currentCount) / batch.initialCount) *
          100
        : 0;

    return {
      batchId: batch.id,
      batchName: batch.batchName,
      fcr: Number(fcr.toFixed(2)),
      totalFeed: Number(totalFeed.toFixed(2)),
      currentWeight: Number(currentWeight.toFixed(3)),
      totalDead,
      mortalityRate: Number(mortalityRate.toFixed(2)),
      initialCount: batch.initialCount,
      currentCount: batch.currentCount,
    };
  }

  async getMortalityTrends(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    const mortalityData = await this.prisma.healthMortality.findMany({
      where: { farmId, type: 'DEAD', isDeleted: false },
      orderBy: { logDate: 'asc' },
      select: { logDate: true, count: true },
    });

    const trends: Record<string, number> = {};
    for (const log of mortalityData) {
      const date = log.logDate.toISOString().split('T')[0];
      trends[date] = (trends[date] || 0) + log.count;
    }

    return Object.entries(trends).map(([date, count]) => ({ date, count }));
  }
}
