import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, type Content, type FunctionDeclaration } from '@google/genai';

@Injectable()
export class GeminiClient implements OnModuleInit {
  private readonly logger = new Logger(GeminiClient.name);
  private client!: GoogleGenAI;
  public model = 'gemini-2.5-flash';

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required to start the AI assistant.');
    }
    this.model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    this.client = new GoogleGenAI({ apiKey });
    this.logger.log(`GeminiClient ready (model=${this.model})`);
  }

  generateContentStream(opts: {
    contents: Content[];
    systemInstruction: string;
    tools: FunctionDeclaration[];
    abortSignal?: AbortSignal;
  }) {
    return this.client.models.generateContentStream({
      model: this.model,
      contents: opts.contents,
      config: {
        systemInstruction: opts.systemInstruction,
        tools: [{ functionDeclarations: opts.tools }],
        abortSignal: opts.abortSignal,
      },
    });
  }
}
