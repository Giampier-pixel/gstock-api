import { Injectable, Logger } from '@nestjs/common';
import type { Content } from '@google/genai';
import { GeminiClient } from './gemini.client';
import { TOOL_DEFINITIONS } from './tools/tool-definitions';
import { ToolRegistry } from './tools/tool-registry';
import { buildSystemPrompt } from './prompts/system-prompt';
import type { ChatEvent, ChatMessage, FunctionCall } from './types';

const MAX_ITERATIONS = 5;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly gemini: GeminiClient,
    private readonly tools: ToolRegistry,
  ) {}

  async *chat(
    messages: ChatMessage[],
    userId: string,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<ChatEvent> {
    const history: Content[] = messages.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const stream = await this.gemini.generateContentStream({
        contents: history,
        systemInstruction: buildSystemPrompt(),
        tools: TOOL_DEFINITIONS,
        abortSignal,
      });

      const pendingCalls: FunctionCall[] = [];

      try {
        for await (const chunk of stream as AsyncIterable<{
          text?: string;
          functionCalls?: FunctionCall[];
        }>) {
          if (chunk.functionCalls?.length) {
            pendingCalls.push(...chunk.functionCalls);
          }
          if (chunk.text) {
            yield { type: 'token', text: chunk.text };
          }
        }
      } catch (err) {
        this.logger.error(`Gemini stream error: ${(err as Error).message}`);
        yield { type: 'error', message: 'El asistente tuvo un problema. Intenta de nuevo.' };
        return;
      }

      if (pendingCalls.length === 0) {
        yield { type: 'done' };
        return;
      }

      yield { type: 'tool_call', names: pendingCalls.map((c) => c.name ?? 'unknown') };

      const responses = await Promise.all(
        pendingCalls.map((fc) => this.tools.execute(fc, { userId })),
      );

      history.push({
        role: 'model',
        parts: pendingCalls.map((fc) => ({ functionCall: fc })),
      });
      history.push({
        role: 'user',
        parts: responses.map((r) => ({ functionResponse: r })),
      });
    }

    yield {
      type: 'error',
      message:
        'No pude resolver tu consulta: se alcanzó el límite de iteraciones. Reformúlala por favor.',
    };
  }
}
