import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import express, { type Express, type Request, type Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from '../src/app.module';
import { ProblemJsonFilter } from '../src/common/filters/problem-json.filter';

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

function isAllowedOrigin(origin: string, allowList: string[]): boolean {
  if (allowList.includes(origin)) return true;
  return /^https:\/\/gstock-[a-z0-9-]+-giampiers-projects\.vercel\.app$/.test(origin);
}

let cached: Express | null = null;
let bootstrapping: Promise<Express> | null = null;

async function bootstrap(): Promise<Express> {
  if (cached) return cached;
  if (bootstrapping) return bootstrapping;

  bootstrapping = (async () => {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      bufferLogs: true,
    });
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
    if (process.env.NODE_ENV === 'production' && swaggerUser && swaggerPassword) {
      expressApp.use('/docs', (req: Request, res: Response, next) => {
        const auth = req.headers.authorization;
        if (!auth?.startsWith('Basic ')) {
          res.setHeader('WWW-Authenticate', 'Basic realm="gstock-api docs"');
          return res.status(401).send('Authentication required.');
        }
        const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString().split(':');
        if (user !== swaggerUser || pass !== swaggerPassword) {
          res.setHeader('WWW-Authenticate', 'Basic realm="gstock-api docs"');
          return res.status(401).send('Invalid credentials.');
        }
        next();
      });
    }

    const swaggerConfig = new DocumentBuilder()
      .setTitle('gstock API')
      .setDescription('REST API for the gstock inventory app.')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json' });

    await app.init();
    cached = expressApp;
    return expressApp;
  })();

  return bootstrapping;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await bootstrap();
  return app(req as Request, res as Response);
}
