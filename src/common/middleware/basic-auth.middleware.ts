import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

function safeEquals(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function parseBasicAuth(header: string | undefined): { username: string; password: string } | null {
  if (!header?.startsWith('Basic ')) return null;

  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function createBasicAuthMiddleware(username: string, password: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const credentials = parseBasicAuth(req.headers.authorization);
    if (
      !credentials ||
      !safeEquals(credentials.username, username) ||
      !safeEquals(credentials.password, password)
    ) {
      res.setHeader('WWW-Authenticate', 'Basic realm="gstock-api docs"');
      return res.status(401).send('Authentication required.');
    }

    next();
  };
}
