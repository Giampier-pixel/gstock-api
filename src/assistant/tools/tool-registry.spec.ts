import { ToolRegistry } from './tool-registry';
import type { ToolHandler } from '../types';

describe('ToolRegistry', () => {
  const okHandler: ToolHandler = jest.fn().mockResolvedValue({ ok: 1 });
  const throwHandler: ToolHandler = jest.fn().mockRejectedValue(new Error('boom'));

  beforeEach(() => jest.clearAllMocks());

  it('executes registered handler with args and returns functionResponse', async () => {
    const registry = new ToolRegistry({ foo: okHandler });
    const response = await registry.execute(
      { id: 'c1', name: 'foo', args: { x: 1 } },
      { userId: 'u' },
    );
    expect(okHandler).toHaveBeenCalledWith({ x: 1 }, { userId: 'u' });
    expect(response).toEqual({
      id: 'c1',
      name: 'foo',
      response: { ok: 1 },
    });
  });

  it('returns error response when handler throws', async () => {
    const registry = new ToolRegistry({ bar: throwHandler });
    const response = await registry.execute(
      { id: 'c2', name: 'bar', args: {} },
      { userId: 'u' },
    );
    expect(response).toEqual({
      id: 'c2',
      name: 'bar',
      response: { error: 'boom' },
    });
  });

  it('returns error response when tool name is unknown', async () => {
    const registry = new ToolRegistry({ foo: okHandler });
    const response = await registry.execute(
      { id: 'c3', name: 'nonexistent', args: {} },
      { userId: 'u' },
    );
    expect(response.response).toEqual({ error: expect.stringContaining('nonexistent') });
  });

  it('handler receives empty object when args is undefined', async () => {
    const registry = new ToolRegistry({ foo: okHandler });
    await registry.execute({ id: 'c4', name: 'foo' }, { userId: 'u' });
    expect(okHandler).toHaveBeenCalledWith({}, { userId: 'u' });
  });
});
