import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RemindersService } from '../reminders/reminders.service';
import { NOTIFICATIONS_QUEUE } from './queue.constants';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly remindersService: RemindersService) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === 'daily-reminders') {
      const result = await this.remindersService.evaluateDailyReminders();
      this.logger.log(
        `daily-reminders job ${job.id}: ${result.farmsWithAlerts} farm(s) with alerts`,
      );
      for (const farm of result.results) {
        for (const alert of farm.alerts) {
          this.logger.warn(
            `[${farm.farmName}] ${alert.type}: ${alert.message}`,
          );
        }
      }
      return result;
    }

    this.logger.log(
      `notifications job ${job.id} received (${job.name}) — ignored`,
    );
    return { ignored: true };
  }
}
