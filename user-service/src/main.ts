import 'reflect-metadata';
import { NestFactory }        from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';

import { AppModule }            from './app.module';
import { TransformInterceptor } from './common/transform.interceptor';
import { AllExceptionsFilter }  from './common/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug'],
  });

  // ── Global validation pipe ──────────────────────────────────────────────
  // Applies class-validator / class-transformer to every incoming request body.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,   // strip unknown properties
      forbidNonWhitelisted: true,   // reject requests with unknown properties
      transform:            true,   // auto-cast primitives (e.g. "1" → 1)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global response interceptor & exception filter (universal JSON schema) ──
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── CORS — allow the API Gateway and dev tools ──────────────────────────
  app.enableCors({
    origin:  ['http://localhost:3000', 'http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);

  logger.log(`User Service running on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start User Service:', err);
  process.exit(1);
});
