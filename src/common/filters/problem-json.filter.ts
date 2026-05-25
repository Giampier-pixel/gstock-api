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

interface PrismaProblem {
  status: HttpStatus;
  detail: string;
}

const TYPE_BASE = 'https://gstock.vercel.app/errors';

const PRISMA_PROBLEMS: Record<string, PrismaProblem> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    detail: 'Unique constraint violated.',
  },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    detail: 'Related resource constraint violated.',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    detail: 'Resource not found.',
  },
};

@Catch()
export class ProblemJsonFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemJsonFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const problem = this.buildProblem(exception, request.path);

    if (problem.status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unhandled exception',
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(problem.status).type('application/problem+json').json(problem);
  }

  private buildProblem(exception: unknown, instance: string): ProblemDetails {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const title = this.titleFor(status);
      const type = `${TYPE_BASE}/${this.slug(status)}`;

      if (typeof res === 'string') {
        return { type, title, status, detail: res, instance };
      }

      const problem: ProblemDetails = {
        type,
        title,
        status,
        detail: this.httpDetail(res, title),
        instance,
      };

      const errors = this.httpErrors(res);
      if (errors) {
        problem.errors = errors;
      }
      return problem;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const known = PRISMA_PROBLEMS[exception.code] ?? {
        status: HttpStatus.BAD_REQUEST,
        detail: 'Database request failed.',
      };
      const title = this.titleFor(known.status);
      return {
        type: `${TYPE_BASE}/${this.slug(known.status)}`,
        title,
        status: known.status,
        detail: known.detail,
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

  private httpDetail(response: object, fallback: string): string {
    const body = response as { message?: unknown; error?: unknown };
    if (Array.isArray(body.message)) return body.message.join('; ');
    if (typeof body.message === 'string') return body.message;
    if (typeof body.error === 'string') return body.error;
    return fallback;
  }

  private httpErrors(response: object): Record<string, string[]> | undefined {
    const body = response as { message?: unknown };
    return Array.isArray(body.message) ? { _: body.message.map(String) } : undefined;
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
