import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NOTIFICATIONS_QUEUE } from '../workers/queue.constants';
import { PrismaModule } from '../prisma/prisma.module';
import { RemindersScheduler } from './reminders.scheduler';
import { RemindersService } from './reminders.service';

/** Service-only module for the worker process (no cron). */
@Module({
  imports: [PrismaModule],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersCoreModule {}

/** API process: schedules reminder evaluation jobs onto BullMQ. */
@Module({
  imports: [
    RemindersCoreModule,
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  providers: [RemindersScheduler],
  exports: [RemindersCoreModule],
})
export class RemindersModule {}
