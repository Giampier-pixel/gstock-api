import type { FunctionCall, FunctionDeclaration, FunctionResponse } from '@google/genai';

export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type ChatEvent =
  | { type: 'token'; text: string }
  | { type: 'tool_call'; names: string[] }
  | { type: 'done' }
  | { type: 'error'; message: string };

export type { FunctionCall, FunctionDeclaration, FunctionResponse };

export interface ToolContext {
  userId: string;
}

export type ToolHandler = (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
