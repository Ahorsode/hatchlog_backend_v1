import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';

type DaySumRow = { day: Date; value: Prisma.Decimal | number | bigint | null };

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalBirds,
      eggsData,
      mortalityData,
      totalInitialBirds,
      activeBatchesCount,
      todayMortality,
      todayEggs,
      eggDaySums,
      feedDaySums,
      mortalityDaySums,
      totalExpenses,
      recentOrders,
      supplierDebt,
      customerDebt,
      activeBatchRows,
      lowFeedRows,
    ] = await Promise.all([
      this.prisma.livestock.aggregate({
        where: { status: 'active', farmId, isDeleted: false },
        _sum: { currentCount: true },
      }),
      this.prisma.eggProduction.aggregate({
        where: { farmId, isDeleted: false },
        _sum: { eggsCollected: true },
      }),
      this.prisma.healthMortality.aggregate({
        where: { farmId, type: 'DEAD', isDeleted: false },
        _sum: { count: true },
      }),
      this.prisma.livestock.aggregate({
        where: { farmId, isDeleted: false },
        _sum: { initialCount: true },
      }),
      this.prisma.livestock.count({
        where: { status: 'active', farmId, isDeleted: false },
      }),
      this.prisma.healthMortality.aggregate({
        where: {
          logDate: { gte: today },
          farmId,
          type: 'DEAD',
          isDeleted: false,
        },
        _sum: { count: true },
      }),
      this.prisma.eggProduction.aggregate({
        where: { logDate: { gte: today }, farmId, isDeleted: false },
        _sum: { eggsCollected: true },
      }),
      this.prisma.$queryRaw<DaySumRow[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', "logDate") AS day,
               COALESCE(SUM("eggsCollected"), 0) AS value
        FROM egg_production
        WHERE "farmId" = ${farmId}
          AND "logDate" >= ${sevenDaysAgo}
          AND "is_deleted" = false
        GROUP BY 1
      `),
      this.prisma.$queryRaw<DaySumRow[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', "logDate") AS day,
               COALESCE(SUM("amount_consumed"), 0) AS value
        FROM daily_feeding_logs
        WHERE "farmId" = ${farmId}
          AND "logDate" >= ${sevenDaysAgo}
          AND "is_deleted" = false
        GROUP BY 1
      `),
      this.prisma.$queryRaw<DaySumRow[]>(Prisma.sql`
        SELECT DATE_TRUNC('day', "logDate") AS day,
               COALESCE(SUM(count), 0) AS value
        FROM mortality
        WHERE "farmId" = ${farmId}
          AND type = 'DEAD'
          AND "logDate" >= ${sevenDaysAgo}
          AND "is_deleted" = false
        GROUP BY 1
      `),
      this.prisma.expense.aggregate({
        where: { farmId, isDeleted: false },
        _sum: { amount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          orderDate: { gte: sevenDaysAgo },
          farmId,
          isDeleted: false,
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.supplier.aggregate({
        where: { farmId },
        _sum: { balanceOwed: true },
      }),
      this.prisma.customer.aggregate({
        where: { farmId },
        _sum: { balanceOwed: true },
      }),
      this.prisma.livestock.findMany({
        where: { farmId, status: 'active', isDeleted: false },
        select: {
          id: true,
          batchName: true,
          breedType: true,
          currentCount: true,
          arrivalDate: true,
          status: true,
          type: true,
          localBatchId: true,
          house: { select: { name: true } },
        },
        orderBy: { arrivalDate: 'desc' },
        take: 100,
      }),
      this.prisma.inventory.findMany({
        where: {
          farmId,
          isDeleted: false,
          stockLevel: { gt: 0 },
        },
        select: {
          itemName: true,
          stockLevel: true,
          category: true,
          reorderLevel: true,
        },
        take: 200,
      }),
    ]);

    const totalBirdCount = totalBirds._sum.currentCount || 0;
    const totalEggs = eggsData._sum.eggsCollected || 0;
    const totalDead = mortalityData._sum.count || 0;
    const initialBirds = totalInitialBirds._sum.initialCount || 0;
    const mortalityRate =
      initialBirds > 0
        ? Number(((totalDead / initialBirds) * 100).toFixed(2))
        : 0;

    const eggSeries = this.buildDailySeriesFromSums(eggDaySums, sevenDaysAgo);
    const feedSeries = this.buildDailySeriesFromSums(feedDaySums, sevenDaysAgo);
    const mortalitySeries = this.buildDailySeriesFromSums(
      mortalityDaySums,
      sevenDaysAgo,
    );

    const activeBatches = activeBatchRows.map((batch, index) => ({
      id: batch.id,
      batchName: batch.batchName,
      breed: batch.breedType || 'unknown',
      quantity: batch.currentCount,
      hatchDate: batch.arrivalDate.toISOString(),
      status: batch.status,
      houseNumber: batch.house?.name || '',
      numericId: batch.localBatchId ?? index + 1,
      type: batch.type,
      house: batch.house,
      currentCount: batch.currentCount,
    }));

    const lowFeedItems = lowFeedRows
      .filter((item) => {
        const category = String(item.category || '').toLowerCase();
        const isFeed = category.includes('feed') || category.includes('mash');
        const stock = Number(item.stockLevel || 0);
        const threshold = Number(item.reorderLevel ?? 5);
        return isFeed && stock <= threshold;
      })
      .slice(0, 50)
      .map((item) => ({
        name: item.itemName || 'Feed',
        stockLevel: Number(item.stockLevel || 0),
        category: String(item.category || 'FEED'),
      }));

    return {
      totalBirdCount,
      activeBatches: activeBatchesCount,
      totalEggs,
      todayEggs: todayEggs._sum.eggsCollected || 0,
      totalDead,
      todayDead: todayMortality._sum.count || 0,
      mortalityRate,
      totalFeed: feedSeries.reduce((sum, d) => sum + d.value, 0),
      totalExpenses: Number(totalExpenses._sum.amount || 0),
      recentOrdersTotal: Number(recentOrders._sum.totalAmount || 0),
      recentOrdersCount: recentOrders._count || 0,
      supplierDebt: Number(supplierDebt._sum.balanceOwed || 0),
      customerDebt: Number(customerDebt._sum.balanceOwed || 0),
      series: {
        eggs: eggSeries,
        feed: feedSeries,
        mortality: mortalitySeries,
      },
      activeBatchRows: activeBatches,
      lowFeedItems,
    };
  }

  async getMonthlySummary(user: AuthUser, farmId: string) {
    assertFarmAccess(user, farmId);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const [sales, expenses, eggs] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          farmId,
          isDeleted: false,
          saleDate: { gte: monthStart },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          farmId,
          isDeleted: false,
          expenseDate: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.eggProduction.aggregate({
        where: {
          farmId,
          logDate: { gte: monthStart },
          isDeleted: false,
        },
        _sum: { eggsCollected: true },
      }),
    ]);

    return {
      revenue: Number(sales._sum.totalAmount || 0),
      expenses: Number(expenses._sum.amount || 0),
      eggs: eggs._sum.eggsCollected || 0,
    };
  }

  private buildDailySeriesFromSums(records: DaySumRow[], startDate: Date) {
    const map = new Map<string, number>();
    for (const record of records) {
      map.set(this.toDateKey(record.day), this.toNumber(record.value));
    }

    const result: { date: string; value: number }[] = [];
    const cursor = new Date(startDate);
    const now = new Date();
    while (cursor <= now) {
      const key = this.toDateKey(cursor);
      result.push({ date: key, value: map.get(key) || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
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
