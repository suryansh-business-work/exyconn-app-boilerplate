import { pino, type DestinationStream, type Logger } from 'pino';
import type { Env } from '../config/env';

export type { Logger } from 'pino';

const REDACTED_PATHS = [
  'password',
  'passwordHash',
  'accessToken',
  'refreshToken',
  '*.password',
  '*.passwordHash',
  '*.accessToken',
  '*.refreshToken',
  'headers.authorization',
  'headers.cookie',
];

/** Structured JSON logger. Credentials are removed even if a caller logs them by mistake. */
export function createLogger(env: Pick<Env, 'LOG_LEVEL'>, destination?: DestinationStream): Logger {
  return pino(
    {
      level: env.LOG_LEVEL,
      redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
      base: { service: 'server' },
    },
    destination,
  );
}
