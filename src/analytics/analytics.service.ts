import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import type {
  BatchAnalyticsQueryDto,
  ComprehensiveReportQueryDto,
} from '../common/dto/domain.dto';
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
    const currentWeight = Number(batch.weightRecords[0]?.averageWeight || 0);
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
        ? ((batch.initialCount - batch.currentCount) / batch.initialCount) * 100
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

  async getComprehensiveReport(
    user: AuthUser,
    query: ComprehensiveReportQueryDto,
  ) {
    assertFarmAccess(user, query.farm_id);
    const farmId = query.farm_id;

    const start = new Date(query.start_date);
    const end = new Date(query.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start_date or end_date');
    }
    end.setHours(23, 59, 59, 999);

    const [
      transactions,
      feedLogs,
      eggProductions,
      mortalities,
      batches,
      auditLogs,
    ] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where: {
          farmId,
          transactionDate: { gte: start, lte: end },
          isDeleted: false,
          deletedAt: null,
        },
        include: {
          user: { select: { firstname: true, surname: true } },
        },
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.feedingLog.findMany({
        where: {
          farmId,
          logDate: { gte: start, lte: end },
          isDeleted: false,
        },
        orderBy: { logDate: 'asc' },
      }),
      this.prisma.eggProduction.findMany({
        where: {
          farmId,
          logDate: { gte: start, lte: end },
          isDeleted: false,
        },
        orderBy: { logDate: 'asc' },
      }),
      this.prisma.healthMortality.findMany({
        where: {
          farmId,
          logDate: { gte: start, lte: end },
          isDeleted: false,
        },
        orderBy: { logDate: 'asc' },
      }),
      this.prisma.livestock.findMany({
        where: { farmId, isDeleted: false },
        include: {
          feedingLogs: { where: { isDeleted: false } },
          mortalityRecords: { where: { isDeleted: false } },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          farmId,
          createdAt: { gte: start, lte: end },
        },
        include: {
          user: { select: { firstname: true, surname: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    let totalRevenue = 0;
    let totalExpense = 0;
    const revenueByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    const paymentStatusMatrix: Record<
      string,
      { count: number; total: number }
    > = {};

    const formattedFinancials = transactions.map((t) => {
      const amount = Number(t.amount);
      if (t.type === 'REVENUE') {
        totalRevenue += amount;
        revenueByCategory[t.category] =
          (revenueByCategory[t.category] || 0) + amount;
      } else {
        totalExpense += amount;
        expenseByCategory[t.category] =
          (expenseByCategory[t.category] || 0) + amount;
      }

      const status = t.paymentStatus || 'UNPAID';
      if (!paymentStatusMatrix[status]) {
        paymentStatusMatrix[status] = { count: 0, total: 0 };
      }
      paymentStatusMatrix[status].count += 1;
      paymentStatusMatrix[status].total += amount;

      return {
        id: t.id,
        type: t.type,
        category: t.category,
        amount,
        paymentStatus: t.paymentStatus,
        paymentMethod: t.paymentMethod,
        transactionDate: t.transactionDate.toISOString(),
        description: t.description,
        referenceNum: t.referenceNum,
        userName: t.user
          ? `${t.user.firstname || ''} ${t.user.surname || ''}`.trim()
          : 'System',
      };
    });

    const netIncome = totalRevenue - totalExpense;
    const totalFeedConsumed = feedLogs.reduce(
      (acc, log) => acc + Number(log.amountConsumed),
      0,
    );
    const totalEggsCollected = eggProductions.reduce(
      (acc, log) => acc + log.eggsCollected,
      0,
    );
    const totalMortality = mortalities.reduce((acc, log) => acc + log.count, 0);

    let totalInitialBirds = 0;
    let totalCurrentBirds = 0;
    const formattedBatches = batches.map((b) => {
      if (b.status === 'active') {
        totalInitialBirds += b.initialCount;
        totalCurrentBirds += b.currentCount;
      }

      const batchFeed = b.feedingLogs.reduce(
        (acc, log) => acc + Number(log.amountConsumed),
        0,
      );
      const batchMortality = b.mortalityRecords.reduce(
        (acc, log) => acc + log.count,
        0,
      );

      return {
        id: b.id,
        batchName:
          b.batchName || `Batch ${b.localBatchId || b.id.substring(0, 5)}`,
        initialCount: b.initialCount,
        currentCount: b.currentCount,
        status: b.status,
        mortalityCount: batchMortality,
        feedConsumed: batchFeed,
      };
    });

    const mortalityRate =
      totalInitialBirds > 0
        ? Number(
            (
              ((totalInitialBirds - totalCurrentBirds) / totalInitialBirds) *
              100
            ).toFixed(2),
          )
        : 0;

    let totalFcrSum = 0;
    let batchesWithFcrCount = 0;
    for (const b of batches) {
      const batchFeed = b.feedingLogs.reduce(
        (acc, log) => acc + Number(log.amountConsumed),
        0,
      );
      if (batchFeed > 0 && b.currentCount > 0) {
        totalFcrSum += batchFeed / (b.currentCount * 1.8);
        batchesWithFcrCount++;
      }
    }
    const averageFcr =
      batchesWithFcrCount > 0
        ? Number((totalFcrSum / batchesWithFcrCount).toFixed(2))
        : 1.65;

    const trendsMap: Record<
      string,
      {
        revenue: number;
        expense: number;
        eggs: number;
        feed: number;
        mortality: number;
      }
    > = {};

    const day = new Date(start);
    while (day <= end) {
      const dateStr = day.toISOString().split('T')[0];
      trendsMap[dateStr] = {
        revenue: 0,
        expense: 0,
        eggs: 0,
        feed: 0,
        mortality: 0,
      };
      day.setDate(day.getDate() + 1);
    }

    for (const t of transactions) {
      const dateStr = t.transactionDate.toISOString().split('T')[0];
      if (!trendsMap[dateStr]) continue;
      const val = Number(t.amount);
      if (t.type === 'REVENUE') trendsMap[dateStr].revenue += val;
      else trendsMap[dateStr].expense += val;
    }

    for (const ep of eggProductions) {
      const dateStr = ep.logDate.toISOString().split('T')[0];
      if (trendsMap[dateStr]) trendsMap[dateStr].eggs += ep.eggsCollected;
    }

    for (const fl of feedLogs) {
      const dateStr = fl.logDate.toISOString().split('T')[0];
      if (trendsMap[dateStr]) {
        trendsMap[dateStr].feed += Number(fl.amountConsumed);
      }
    }

    for (const m of mortalities) {
      const dateStr = m.logDate.toISOString().split('T')[0];
      if (trendsMap[dateStr]) trendsMap[dateStr].mortality += m.count;
    }

    const dailyTrends = Object.entries(trendsMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const formattedAudit = auditLogs.map((l) => ({
      id: l.id,
      actionType: l.actionType,
      description: l.description,
      createdAt: l.createdAt.toISOString(),
      userName: l.user
        ? `${l.user.firstname || ''} ${l.user.surname || ''}`.trim()
        : 'System',
    }));

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      kpis: {
        totalRevenue,
        totalExpense,
        netIncome,
        totalFeedConsumed,
        totalEggsCollected,
        totalMortality,
        mortalityRate,
        averageFcr,
      },
      financials: formattedFinancials,
      revenueByCategory,
      expenseByCategory,
      paymentStatusMatrix,
      dailyTrends,
      batches: formattedBatches,
      auditTimeline: formattedAudit,
      production: {
        totalFeedConsumed,
        totalEggsCollected,
        totalMortality,
        mortalityRate,
        averageFcr,
        batches: formattedBatches,
      },
    };
  }
}
