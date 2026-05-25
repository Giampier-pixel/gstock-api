import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GeminiClient } from '../src/assistant/gemini.client';

describe('Assistant (e2e)', () => {
  let app: INestApplication;

  const fakeStream = (chunks: unknown[]) =>
    (async function* () {
      for (const c of chunks) yield c;
    })();

  beforeAll(async () => {
    process.env.GEMINI_API_KEY = 'fake';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GeminiClient)
      .useValue({
        onModuleInit: () => undefined,
        model: 'gemini-2.5-flash',
        generateContentStream: () =>
          Promise.resolve(fakeStream([{ text: 'Hola desde el assistant' }])),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 without auth', async () => {
    await request(app.getHttpServer())
      .post('/v1/assistant/chat')
      .send({ messages: [{ role: 'user', content: 'hola' }] })
      .expect(401);
  });
});
