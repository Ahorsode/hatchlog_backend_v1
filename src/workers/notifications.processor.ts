import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NOTIFICATIONS_QUEUE } from './queue.constants';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(
      `notifications job ${job.id} received (${job.name}) — no-op stub`,
    );
  }
}
