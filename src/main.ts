import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger as NestLogger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ProblemJsonFilter } from './common/filters/problem-json.filter';
import { createBasicAuthMiddleware } from './common/middleware/basic-auth.middleware';

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string, allowList: string[]): boolean {
  if (allowList.includes(origin)) return true;
  return /^https:\/\/gstock-[a-z0-9-]+-giampiers-projects\.vercel\.app$/.test(origin);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.use(helmet());

  const allowList = parseOrigins(process.env.CORS_ORIGIN);
  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return cb(null, true);
      if (isAllowedOrigin(origin, allowList)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new ProblemJsonFilter());

  const swaggerUser = process.env.SWAGGER_USER;
  const swaggerPassword = process.env.SWAGGER_PASSWORD;
  const protectSwagger = process.env.NODE_ENV === 'production' && swaggerUser && swaggerPassword;

  if (protectSwagger) {
    app.use(['/docs', '/docs-json'], createBasicAuthMiddleware(swaggerUser, swaggerPassword));
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('gstock API')
    .setDescription('REST API for the gstock inventory app.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json' });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  NestLogger.log(`gstock-api listening on :${port}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
