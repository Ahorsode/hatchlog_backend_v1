import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NOTIFICATIONS_QUEUE, SYNC_REPAIR_QUEUE } from './queue.constants';
import { NotificationsProcessor } from './notifications.processor';
import { SyncRepairProcessor } from './sync-repair.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: SYNC_REPAIR_QUEUE },
      { name: NOTIFICATIONS_QUEUE },
    ),
  ],
  providers: [SyncRepairProcessor, NotificationsProcessor],
})
export class WorkersModule {}
