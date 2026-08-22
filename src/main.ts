import './load-env';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import type { Env } from './config/env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('HatchLog API')
    .setDescription(
      'Enterprise NestJS backend for HatchLog web, mobile, and desktop clients.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const config = app.get(ConfigService<Env, true>);
  const port = config.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`HatchLog API listening on http://0.0.0.0:${port}`);
  logger.log(`OpenAPI docs at http://localhost:${port}/docs`);
}

void bootstrap().catch((error) => {
  console.error('HatchLog API bootstrap failed:', error);
  process.exit(1);
});
