import { AssistantService } from './assistant.service';
import { GeminiClient } from './gemini.client';
import { ToolRegistry } from './tools/tool-registry';
import type { ChatEvent } from './types';

const fakeStream = (chunks: unknown[]) =>
  (async function* () {
    for (const c of chunks) yield c;
  })();

const collect = async (gen: AsyncIterable<ChatEvent>): Promise<ChatEvent[]> => {
  const out: ChatEvent[] = [];
  for await (const ev of gen) out.push(ev);
  return out;
};

describe('AssistantService', () => {
  const geminiMock: Pick<GeminiClient, 'generateContentStream'> = {
    generateContentStream: jest.fn(),
  };

  const buildService = (registry: ToolRegistry): AssistantService => {
    return new AssistantService(geminiMock as GeminiClient, registry);
  };

  beforeEach(() => jest.clearAllMocks());

  it('emits tokens and done when model returns text without tools', async () => {
    (geminiMock.generateContentStream as jest.Mock).mockReturnValueOnce(
      Promise.resolve(
        fakeStream([
          { text: 'Hola ', functionCalls: undefined },
          { text: 'mundo', functionCalls: undefined },
        ]),
      ),
    );
    const registry = new ToolRegistry({});
    const service = buildService(registry);

    const events = await collect(service.chat([{ role: 'user', content: 'hi' }], 'user-1'));

    expect(events).toEqual([
      { type: 'token', text: 'Hola ' },
      { type: 'token', text: 'mundo' },
      { type: 'done' },
    ]);
  });

  it('executes tool calls and continues until model emits text', async () => {
    (geminiMock.generateContentStream as jest.Mock)
      .mockReturnValueOnce(
        Promise.resolve(
          fakeStream([{ functionCalls: [{ id: 'c1', name: 'foo', args: { x: 1 } }] }]),
        ),
      )
      .mockReturnValueOnce(Promise.resolve(fakeStream([{ text: 'final' }])));

    const handler = jest.fn().mockResolvedValue({ ok: true });
    const registry = new ToolRegistry({ foo: handler });
    const service = buildService(registry);

    const events = await collect(service.chat([{ role: 'user', content: 'q' }], 'user-1'));

    expect(handler).toHaveBeenCalledWith({ x: 1 }, { userId: 'user-1' });
    expect(events).toEqual([
      { type: 'tool_call', names: ['foo'] },
      { type: 'token', text: 'final' },
      { type: 'done' },
    ]);
  });

  it('emits error when MAX_ITERATIONS exceeded', async () => {
    (geminiMock.generateContentStream as jest.Mock).mockImplementation(() =>
      Promise.resolve(fakeStream([{ functionCalls: [{ id: 'cN', name: 'foo' }] }])),
    );
    const handler = jest.fn().mockResolvedValue({});
    const registry = new ToolRegistry({ foo: handler });
    const service = buildService(registry);

    const events = await collect(service.chat([{ role: 'user', content: 'q' }], 'user-1'));

    expect(events.at(-1)).toEqual({ type: 'error', message: expect.stringContaining('límite') });
  });

  it('propagates tool errors as functionResponse without breaking the stream', async () => {
    (geminiMock.generateContentStream as jest.Mock)
      .mockReturnValueOnce(
        Promise.resolve(fakeStream([{ functionCalls: [{ id: 'c1', name: 'broken' }] }])),
      )
      .mockReturnValueOnce(Promise.resolve(fakeStream([{ text: 'pude continuar' }])));

    const handler = jest.fn().mockRejectedValue(new Error('boom'));
    const registry = new ToolRegistry({ broken: handler });
    const service = buildService(registry);

    const events = await collect(service.chat([{ role: 'user', content: 'q' }], 'user-1'));

    expect(events).toEqual(
      expect.arrayContaining([
        { type: 'tool_call', names: ['broken'] },
        { type: 'token', text: 'pude continuar' },
        { type: 'done' },
      ]),
    );
  });
});
