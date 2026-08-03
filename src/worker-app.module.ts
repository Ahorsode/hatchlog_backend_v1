import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { validateEnv, type Env } from './config/env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { redisConnectionFromUrl } from './workers/redis.config';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: redisConnectionFromUrl(
          config.get('REDIS_URL', { infer: true }),
        ),
      }),
    }),
    PrismaModule,
    WorkersModule,
  ],
})
export class WorkerAppModule {}
