import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import { PrismaService } from '../prisma/prisma.service';

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
      activeBatches,
      todayMortality,
      todayEggs,
      recentEggs,
      recentFeed,
      recentMortality,
      totalExpenses,
      recentOrders,
      supplierDebt,
      customerDebt,
    ] = await Promise.all([
      this.prisma.livestock.aggregate({
        where: { status: 'active', farmId },
        _sum: { currentCount: true },
      }),
      this.prisma.eggProduction.aggregate({
        where: { farmId },
        _sum: { eggsCollected: true },
      }),
      this.prisma.healthMortality.aggregate({
        where: { farmId, type: 'DEAD' },
        _sum: { count: true },
      }),
      this.prisma.livestock.aggregate({
        where: { farmId },
        _sum: { initialCount: true },
      }),
      this.prisma.livestock.count({
        where: { status: 'active', farmId, isDeleted: false },
      }),
      this.prisma.healthMortality.aggregate({
        where: { logDate: { gte: today }, farmId, type: 'DEAD' },
        _sum: { count: true },
      }),
      this.prisma.eggProduction.aggregate({
        where: { logDate: { gte: today }, farmId },
        _sum: { eggsCollected: true },
      }),
      this.prisma.eggProduction.findMany({
        where: { logDate: { gte: sevenDaysAgo }, farmId },
        orderBy: { logDate: 'asc' },
        select: { logDate: true, eggsCollected: true },
      }),
      this.prisma.feedingLog.findMany({
        where: {
          logDate: { gte: sevenDaysAgo },
          farmId,
          isDeleted: false,
        },
        orderBy: { logDate: 'asc' },
        select: { logDate: true, amountConsumed: true },
      }),
      this.prisma.healthMortality.findMany({
        where: {
          logDate: { gte: sevenDaysAgo },
          farmId,
          type: 'DEAD',
        },
        orderBy: { logDate: 'asc' },
        select: { logDate: true, count: true },
      }),
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
    ]);

    const totalBirdCount = totalBirds._sum.currentCount || 0;
    const totalEggs = eggsData._sum.eggsCollected || 0;
    const totalDead = mortalityData._sum.count || 0;
    const initialBirds = totalInitialBirds._sum.initialCount || 0;
    const mortalityRate =
      initialBirds > 0
        ? Number(((totalDead / initialBirds) * 100).toFixed(2))
        : 0;

    const eggSeries = this.buildDailySeries(
      recentEggs,
      'logDate',
      'eggsCollected',
      sevenDaysAgo,
    );
    const feedSeries = this.buildDailySeries(
      recentFeed,
      'logDate',
      'amountConsumed',
      sevenDaysAgo,
    );
    const mortalitySeries = this.buildDailySeries(
      recentMortality,
      'logDate',
      'count',
      sevenDaysAgo,
    );

    return {
      totalBirdCount,
      activeBatches,
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
    };
  }

  private buildDailySeries(
    records: any[],
    dateKey: string,
    valueKey: string,
    startDate: Date,
  ) {
    const map = new Map<string, number>();
    for (const record of records) {
      const date = new Date(record[dateKey]).toISOString().split('T')[0];
      map.set(date, (map.get(date) || 0) + Number(record[valueKey] || 0));
    }

    const result: { date: string; value: number }[] = [];
    const cursor = new Date(startDate);
    const now = new Date();
    while (cursor <= now) {
      const key = cursor.toISOString().split('T')[0];
      result.push({ date: key, value: map.get(key) || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }
}
