import { Logger } from '@nestjs/common';
import type { FunctionCall, FunctionResponse, ToolContext, ToolHandler } from '../types';

export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);

  constructor(private readonly handlers: Record<string, ToolHandler>) {}

  async execute(call: FunctionCall, ctx: ToolContext): Promise<FunctionResponse> {
    const name = call.name ?? '';
    const handler = this.handlers[name];
    const id = call.id ?? `${name || 'unknown'}-${Date.now()}`;
    const args = (call.args ?? {}) as Record<string, unknown>;

    if (!handler) {
      this.logger.warn(`Unknown tool requested: ${name}`);
      return {
        id,
        name: name || 'unknown',
        response: { error: `Herramienta desconocida: ${name}` },
      };
    }

    try {
      const result = await handler(args, ctx);
      return { id, name, response: result as Record<string, unknown> };
    } catch (err) {
      this.logger.error(`Tool ${name} threw: ${(err as Error).message}`);
      return {
        id,
        name,
        response: { error: (err as Error).message },
      };
    }
  }
}
