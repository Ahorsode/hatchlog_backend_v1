import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SYNC_REPAIR_QUEUE } from '../workers/queue.constants';
import { EggCollectionHandler } from './handlers/egg-collection.handler';
import { FeedUsageHandler } from './handlers/feed-usage.handler';
import { MortalityHandler } from './handlers/mortality.handler';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [BullModule.registerQueue({ name: SYNC_REPAIR_QUEUE })],
  controllers: [SyncController],
  providers: [
    SyncService,
    EggCollectionHandler,
    FeedUsageHandler,
    MortalityHandler,
  ],
})
export class SyncModule {}
