import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import type {
  BatchAnalyticsQueryDto,
  ComprehensiveReportQueryDto,
} from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';

const MORTALITY_TREND_DAYS = 90;
const REPORT_FINANCIAL_TAKE = 200;

type DaySumRow = { day: Date; value: Prisma.Decimal | number | bigint | null };
type TypedDaySumRow = DaySumRow & { type: string };

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBatchAnalytics(user: AuthUser, query: BatchAnalyticsQueryDto) {
    assertFarmAccess(user, query.farm_id);
    const farmId = query.farm_id;
    const batchId = query.batch_id;

    const [batch, feedAgg, mortAgg, latestWeight] = await Promise.all([
      this.prisma.livestock.findFirst({
        where: { id: batchId, farmId },
        select: {
          id: true,
          batchName: true,
          currentCount: true,
          initialCount: true,
        },
      }),
      this.prisma.feedingLog.aggregate({
        where: { batchId, farmId, isDeleted: false },
        _sum: { amountConsumed: true },
      }),
      this.prisma.healthMortality.aggregate({
        where: { batchId, farmId, type: 'DEAD', isDeleted: false },
        _sum: { count: true },
      }),
      this.prisma.weightRecord.findFirst({
        where: { batchId, farmId },
        orderBy: { logDate: 'desc' },
        take: 1,
        select: { averageWeight: true },
      }),
    ]);

    if (!batch) throw new NotFoundException('Batch not found');

    const totalFeed = Number(feedAgg._sum.amountConsumed || 0);
    const currentWeight = Number(latestWeight?.averageWeight || 0);
    const currentBirds = batch.currentCount;
    const totalDead = mortAgg._sum.count || 0;

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

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (MORTALITY_TREND_DAYS - 1));

    const rows = await this.prisma.$queryRaw<DaySumRow[]>(Prisma.sql`
      SELECT DATE_TRUNC('day', "logDate") AS day,
             COALESCE(SUM(count), 0) AS value
      FROM mortality
      WHERE "farmId" = ${farmId}
        AND type = 'DEAD'
        AND "is_deleted" = false
        AND "logDate" >= ${start}
      GROUP BY 1
      ORDER BY 1
    `);

    return rows.map((row) => ({
      date: this.toDateKey(row.day),
      count: this.toNumber(row.value),
    }));
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

    const dateFilter = { gte: start, lte: end };

    const [
      categorySums,
      statusSums,
      feedAgg,
      eggAgg,
      mortAgg,
      transactions,
      batches,
      feedByBatch,
      mortByBatch,
      auditLogs,
      financeByDay,
      eggByDay,
      feedByDay,
      mortByDay,
    ] = await Promise.all([
      this.prisma.financialTransaction.groupBy({
        by: ['type', 'category'],
        where: {
          farmId,
          transactionDate: dateFilter,
          isDeleted: false,
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.groupBy({
        by: ['paymentStatus'],
        where: {
          farmId,
          transactionDate: dateFilter,
          isDeleted: false,
          deletedAt: null,
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.feedingLog.aggregate({
        where: { farmId, logDate: dateFilter, isDeleted: false },
        _sum: { amountConsumed: true },
      }),
      this.prisma.eggProduction.aggregate({
        where: { farmId, logDate: dateFilter, isDeleted: false },
        _sum: { eggsCollected: true },
      }),
      this.prisma.healthMortality.aggregate({
        where: { farmId, logDate: dateFilter, isDeleted: false },
        _sum: { count: true },
      }),
      this.prisma.financialTransaction.findMany({
        where: {
          farmId,
          transactionDate: dateFilter,
          isDeleted: false,
          deletedAt: null,
        },
        include: {
          user: { select: { firstname: true, surname: true } },
        },
        orderBy: { transactionDate: 'desc' },
        take: REPORT_FINANCIAL_TAKE,
      }),
      this.prisma.livestock.findMany({
        where: { farmId, isDeleted: false },
        select: {
          id: true,
          batchName: true,
          localBatchId: true,
          initialCount: true,
          currentCount: true,
          status: true,
        },
      }),
      this.prisma.feedingLog.groupBy({
        by: ['batchId'],
        where: { farmId, isDeleted: false, batchId: { not: null } },
        _sum: { amountConsumed: true },
      }),
      this.prisma.healthMortality.groupBy({
        by: ['batchId'],
        where: { farmId, isDeleted: false },
        _sum: { count: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          farmId,
          createdAt: dateFilter,
        },
        include: {
          user: { select: { firstname: true, surname: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.$queryRaw<TypedDaySumRow[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', transaction_date) AS day,
               type,
               COALESCE(SUM(amount), 0) AS value
        FROM financial_transactions
        WHERE farm_id = ${farmId}
          AND transaction_date >= ${start}
          AND transaction_date <= ${end}
          AND is_deleted = false
        GROUP BY 1, 2
      `),
      this.prisma.$queryRaw<DaySumRow[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', "logDate") AS day,
               COALESCE(SUM("eggsCollected"), 0) AS value
        FROM egg_production
        WHERE "farmId" = ${farmId}
          AND "logDate" >= ${start}
          AND "logDate" <= ${end}
          AND "is_deleted" = false
        GROUP BY 1
      `),
      this.prisma.$queryRaw<DaySumRow[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', "logDate") AS day,
               COALESCE(SUM("amount_consumed"), 0) AS value
        FROM daily_feeding_logs
        WHERE "farmId" = ${farmId}
          AND "logDate" >= ${start}
          AND "logDate" <= ${end}
          AND "is_deleted" = false
        GROUP BY 1
      `),
      this.prisma.$queryRaw<DaySumRow[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', "logDate") AS day,
               COALESCE(SUM(count), 0) AS value
        FROM mortality
        WHERE "farmId" = ${farmId}
          AND "logDate" >= ${start}
          AND "logDate" <= ${end}
          AND "is_deleted" = false
        GROUP BY 1
      `),
    ]);

    let totalRevenue = 0;
    let totalExpense = 0;
    const revenueByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    for (const row of categorySums) {
      const amount = Number(row._sum.amount || 0);
      if (row.type === 'REVENUE') {
        totalRevenue += amount;
        revenueByCategory[row.category] =
          (revenueByCategory[row.category] || 0) + amount;
      } else {
        totalExpense += amount;
        expenseByCategory[row.category] =
          (expenseByCategory[row.category] || 0) + amount;
      }
    }

    const paymentStatusMatrix: Record<
      string,
      { count: number; total: number }
    > = {};
    for (const row of statusSums) {
      paymentStatusMatrix[row.paymentStatus || 'UNPAID'] = {
        count: row._count._all,
        total: Number(row._sum.amount || 0),
      };
    }

    const formattedFinancials = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      category: t.category,
      amount: Number(t.amount),
      paymentStatus: t.paymentStatus,
      paymentMethod: t.paymentMethod,
      transactionDate: t.transactionDate.toISOString(),
      description: t.description,
      referenceNum: t.referenceNum,
      userName: t.user
        ? `${t.user.firstname || ''} ${t.user.surname || ''}`.trim()
        : 'System',
    }));

    const netIncome = totalRevenue - totalExpense;
    const totalFeedConsumed = Number(feedAgg._sum.amountConsumed || 0);
    const totalEggsCollected = eggAgg._sum.eggsCollected || 0;
    const totalMortality = mortAgg._sum.count || 0;

    const feedMap = new Map(
      feedByBatch.map((row) => [
        row.batchId,
        Number(row._sum.amountConsumed || 0),
      ]),
    );
    const mortMap = new Map(
      mortByBatch.map((row) => [row.batchId, row._sum.count || 0]),
    );

    let totalInitialBirds = 0;
    let totalCurrentBirds = 0;
    const formattedBatches = batches.map((b) => {
      if (b.status === 'active') {
        totalInitialBirds += b.initialCount;
        totalCurrentBirds += b.currentCount;
      }
      return {
        id: b.id,
        batchName:
          b.batchName || `Batch ${b.localBatchId || b.id.substring(0, 5)}`,
        initialCount: b.initialCount,
        currentCount: b.currentCount,
        status: b.status,
        mortalityCount: mortMap.get(b.id) || 0,
        feedConsumed: feedMap.get(b.id) || 0,
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
    for (const b of formattedBatches) {
      if (b.feedConsumed > 0 && b.currentCount > 0) {
        totalFcrSum += b.feedConsumed / (b.currentCount * 1.8);
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
      const dateStr = this.toDateKey(day);
      trendsMap[dateStr] = {
        revenue: 0,
        expense: 0,
        eggs: 0,
        feed: 0,
        mortality: 0,
      };
      day.setDate(day.getDate() + 1);
    }

    for (const row of financeByDay) {
      const dateStr = this.toDateKey(row.day);
      if (!trendsMap[dateStr]) continue;
      const val = this.toNumber(row.value);
      if (row.type === 'REVENUE') trendsMap[dateStr].revenue += val;
      else trendsMap[dateStr].expense += val;
    }
    for (const row of eggByDay) {
      const dateStr = this.toDateKey(row.day);
      if (trendsMap[dateStr])
        trendsMap[dateStr].eggs += this.toNumber(row.value);
    }
    for (const row of feedByDay) {
      const dateStr = this.toDateKey(row.day);
      if (trendsMap[dateStr])
        trendsMap[dateStr].feed += this.toNumber(row.value);
    }
    for (const row of mortByDay) {
      const dateStr = this.toDateKey(row.day);
      if (trendsMap[dateStr]) {
        trendsMap[dateStr].mortality += this.toNumber(row.value);
      }
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

  private toDateKey(value: Date | string) {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().split('T')[0];
  }

  private toNumber(value: unknown) {
    if (value == null) return 0;
    if (typeof value === 'bigint') return Number(value);
    return Number(value);
  }
}
