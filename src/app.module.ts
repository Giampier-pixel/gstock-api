import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          remove: true,
        },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
