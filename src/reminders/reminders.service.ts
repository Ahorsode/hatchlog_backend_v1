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

    const farms = await this.prisma.farm.findMany({
      select: { id: true, name: true },
    });

    const results: FarmReminderResult[] = [];

    for (const farm of farms) {
      const settings = await this.prisma.farmSettings.findUnique({
        where: { farmId: farm.id },
      });

      const [eggLogToday, feedLogToday, layerCount] = await Promise.all([
        this.prisma.eggProduction.aggregate({
          where: { farmId: farm.id, logDate: { gte: today }, isDeleted: false },
          _sum: { eggsCollected: true },
        }),
        this.prisma.feedingLog.count({
          where: {
            farmId: farm.id,
            logDate: { gte: today },
            isDeleted: false,
          },
        }),
        this.prisma.livestock.count({
          where: {
            farmId: farm.id,
            status: 'active',
            type: 'POULTRY_LAYER',
            isDeleted: false,
          },
        }),
      ]);

      const alerts = buildDailyReminderAlerts({
        eggRecordReminderTime: settings?.eggRecordReminderTime,
        feedRecordReminderTime: settings?.feedRecordReminderTime,
        hasEggLogToday: (eggLogToday._sum.eggsCollected || 0) > 0,
        hasFeedLogToday: feedLogToday > 0,
        activeLayerBatchCount: layerCount,
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
