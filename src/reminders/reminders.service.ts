import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildDailyReminderAlerts } from './farm-reminders';

export type FarmReminderResult = {
  farmId: string;
  farmName: string;
  alerts: ReturnType<typeof buildDailyReminderAlerts>;
};

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateDailyReminders(now = new Date()) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const [farms, settingsRows, eggByFarm, feedByFarm, layersByFarm] =
      await Promise.all([
        this.prisma.farm.findMany({
          select: { id: true, name: true },
        }),
        this.prisma.farmSettings.findMany({
          select: {
            farmId: true,
            eggRecordReminderTime: true,
            feedRecordReminderTime: true,
          },
        }),
        this.prisma.eggProduction.groupBy({
          by: ['farmId'],
          where: { logDate: { gte: today }, isDeleted: false },
          _sum: { eggsCollected: true },
        }),
        this.prisma.feedingLog.groupBy({
          by: ['farmId'],
          where: { logDate: { gte: today }, isDeleted: false },
          _count: { _all: true },
        }),
        this.prisma.livestock.groupBy({
          by: ['farmId'],
          where: {
            status: 'active',
            type: 'POULTRY_LAYER',
            isDeleted: false,
          },
          _count: { _all: true },
        }),
      ]);

    const settingsByFarm = new Map(
      settingsRows.map((row) => [row.farmId, row]),
    );
    const eggsByFarm = new Map(
      eggByFarm.map((row) => [row.farmId, row._sum.eggsCollected || 0]),
    );
    const feedsByFarm = new Map(
      feedByFarm.map((row) => [row.farmId, row._count._all]),
    );
    const layerCountByFarm = new Map(
      layersByFarm.map((row) => [row.farmId, row._count._all]),
    );

    const results: FarmReminderResult[] = [];

    for (const farm of farms) {
      const settings = settingsByFarm.get(farm.id);
      const alerts = buildDailyReminderAlerts({
        eggRecordReminderTime: settings?.eggRecordReminderTime,
        feedRecordReminderTime: settings?.feedRecordReminderTime,
        hasEggLogToday: (eggsByFarm.get(farm.id) || 0) > 0,
        hasFeedLogToday: (feedsByFarm.get(farm.id) || 0) > 0,
        activeLayerBatchCount: layerCountByFarm.get(farm.id) || 0,
        now,
      });

      if (alerts.length > 0) {
        results.push({
          farmId: farm.id,
          farmName: farm.name,
          alerts,
        });
      }
    }

    this.logger.log(
      `Daily reminders evaluated: ${results.length} farm(s) with alerts`,
    );

    return {
      evaluatedAt: now.toISOString(),
      farmsWithAlerts: results.length,
      results,
    };
  }
}
