import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker-app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('WorkerBootstrap');
  logger.log('HatchLog worker started (BullMQ processors active)');

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, shutting down worker`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
