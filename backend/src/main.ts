import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

export async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000', credentials: true, allowedHeaders: ['Content-Type'], methods: ['GET', 'POST', 'OPTIONS'] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableShutdownHooks();
  return app;
}
async function bootstrap() {
  const app = await createApp();

  // const port = Number(process.env.PORT);

  // await app.listen(port, '0.0.0.0');
  const port = process.env.BACKEND_PORT || 3001;

await app.listen(port, '0.0.0.0');

  console.log(`Backend running on port ${port}`);
}

if (require.main === module) {
  void bootstrap();
}

