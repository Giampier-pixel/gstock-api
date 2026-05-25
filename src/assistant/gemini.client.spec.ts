import { ConfigService } from '@nestjs/config';
import { GeminiClient } from './gemini.client';

describe('GeminiClient', () => {
  it('throws on init when GEMINI_API_KEY is missing', () => {
    const config = { get: () => undefined } as unknown as ConfigService;
    const client = new GeminiClient(config);
    expect(() => client.onModuleInit()).toThrow(/GEMINI_API_KEY/);
  });

  it('initializes when GEMINI_API_KEY is present', () => {
    const config = {
      get: (key: string) =>
        key === 'GEMINI_API_KEY'
          ? 'fake-key'
          : key === 'GEMINI_MODEL'
          ? 'gemini-2.5-flash'
          : undefined,
    } as unknown as ConfigService;
    const client = new GeminiClient(config);
    expect(() => client.onModuleInit()).not.toThrow();
    expect(client.model).toBe('gemini-2.5-flash');
  });

  it('defaults model to gemini-2.5-flash when not set', () => {
    const config = {
      get: (key: string) => (key === 'GEMINI_API_KEY' ? 'fake-key' : undefined),
    } as unknown as ConfigService;
    const client = new GeminiClient(config);
    client.onModuleInit();
    expect(client.model).toBe('gemini-2.5-flash');
  });
});
