import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, depsFromEnv } from './app.module';

export function configureApp(app: { useGlobalPipes: (...p: ValidationPipe[]) => unknown }) {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule.register(depsFromEnv()));
  configureApp(app);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`api listening on http://localhost:${port}`);
}

if (require.main === module) void bootstrap();
