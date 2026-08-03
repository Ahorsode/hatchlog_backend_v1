import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SYNC_REPAIR_QUEUE } from './queue.constants';

@Processor(SYNC_REPAIR_QUEUE)
export class SyncRepairProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncRepairProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(
      `sync-repair job ${job.id} received (${job.name}) — no-op stub`,
    );
  }
}
