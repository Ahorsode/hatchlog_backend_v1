import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from '../workers/queue.constants';

@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue: Queue,
  ) {}

  /** Runs every 15 minutes; worker evaluates farms past their reminder times. */
  @Cron('0 */15 * * * *')
  async enqueueDailyReminderScan() {
    this.logger.log('Enqueueing daily reminder evaluation job');
    await this.notificationsQueue.add(
      'daily-reminders',
      { triggeredAt: new Date().toISOString() },
      {
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    );
  }
}
