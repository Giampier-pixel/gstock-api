import { Body, Controller, Logger, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssistantService } from './assistant.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import type { ChatEvent } from './types';

@ApiTags('assistant')
@ApiBearerAuth('access-token')
@Controller('assistant')
export class AssistantController {
  private readonly logger = new Logger(AssistantController.name);

  constructor(private readonly service: AssistantService) {}

  @Post('chat')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: 'Chat con el asistente de inventario (SSE stream).' })
  async chat(
    @Body() dto: ChatMessageDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const controller = new AbortController();
    req.on('close', () => controller.abort());

    const writeEvent = (event: ChatEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      for await (const event of this.service.chat(dto.messages, userId, controller.signal)) {
        if (controller.signal.aborted) break;
        writeEvent(event);
      }
    } catch (err) {
      this.logger.error(`Chat stream failed: ${(err as Error).message}`);
      writeEvent({ type: 'error', message: 'Error interno del asistente.' });
    } finally {
      res.end();
    }
  }
}
