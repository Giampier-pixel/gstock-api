import { ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';

const MIN_JWT_SECRET_LENGTH = 32;
const DEFAULT_DEVELOPMENT_SECRETS = new Set([
  'dev-only-do-not-use-in-prod',
  'secret',
  'changeme',
  'change-me',
]);

export function parseJwtExpiresIn(raw: string | undefined): JwtSignOptions['expiresIn'] {
  const value = raw?.trim() || '15m';
  const seconds = Number(value);
  if (Number.isSafeInteger(seconds) && seconds > 0) return seconds;
  if (/^\d+\s?(ms|s|m|h|d|w|y)$/i.test(value)) return value as JwtSignOptions['expiresIn'];
  throw new Error('JWT_TTL must be a positive number of seconds or a duration like 15m or 7d');
}

export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  if (!secret) throw new Error('JWT_SECRET is not configured');
  if (secret.length < MIN_JWT_SECRET_LENGTH || DEFAULT_DEVELOPMENT_SECRETS.has(secret)) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters and not use a default value`,
    );
  }
  return secret;
}
