import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance: string;
  errors?: Record<string, string[]>;
  code?: string;
}

const TYPE_BASE = 'https://gstock.vercel.app/errors';

@Catch()
export class ProblemJsonFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemJsonFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const problem = this.buildProblem(exception, request.url);

    if (problem.status >= 500) {
      this.logger.error(exception, exception instanceof Error ? exception.stack : undefined);
    }

    response
      .status(problem.status)
      .type('application/problem+json')
      .json(problem);
  }

  private buildProblem(exception: unknown, instance: string): ProblemDetails {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const title = this.titleFor(status);

      if (typeof res === 'string') {
        return { type: `${TYPE_BASE}/${this.slug(status)}`, title, status, detail: res, instance };
      }

      const body = res as { message?: string | string[]; error?: string };
      const detail = Array.isArray(body.message) ? body.message.join('; ') : body.message ?? title;
      const problem: ProblemDetails = {
        type: `${TYPE_BASE}/${this.slug(status)}`,
        title,
        status,
        detail,
        instance,
      };

      if (Array.isArray(body.message)) {
        problem.errors = { _: body.message };
      }
      return problem;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          type: `${TYPE_BASE}/conflict`,
          title: 'Conflict',
          status: HttpStatus.CONFLICT,
          detail: 'Unique constraint violated.',
          instance,
          code: exception.code,
        };
      }
      if (exception.code === 'P2025') {
        return {
          type: `${TYPE_BASE}/not-found`,
          title: 'Not Found',
          status: HttpStatus.NOT_FOUND,
          detail: 'Resource not found.',
          instance,
          code: exception.code,
        };
      }
      return {
        type: `${TYPE_BASE}/bad-request`,
        title: 'Bad Request',
        status: HttpStatus.BAD_REQUEST,
        detail: exception.message,
        instance,
        code: exception.code,
      };
    }

    return {
      type: `${TYPE_BASE}/internal`,
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Unexpected error.',
      instance,
    };
  }

  private titleFor(status: number): string {
    switch (status) {
      case 400:
        return 'Bad Request';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'Not Found';
      case 409:
        return 'Conflict';
      case 422:
        return 'Unprocessable Entity';
      case 429:
        return 'Too Many Requests';
      default:
        return status >= 500 ? 'Internal Server Error' : 'Error';
    }
  }

  private slug(status: number): string {
    return this.titleFor(status).toLowerCase().replace(/\s+/g, '-');
  }
}
