import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { validateEnv, type Env } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { SyncModule } from './sync/sync.module';
import { redisConnectionFromUrl } from './workers/redis.config';

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
    AuthModule,
    HealthModule,
    SyncModule,
  ],
})
export class AppModule {}
