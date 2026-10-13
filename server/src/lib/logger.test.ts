import { describe, expect, it } from 'vitest';
import { captureLogger } from '../test/harness';
import { createLogger } from './logger';

describe('createLogger', () => {
  it('writes structured entries tagged with the service', () => {
    const { logger, logs } = captureLogger();
    logger.info({ event: 'auth.login', userId: 'user-1' });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ event: 'auth.login', userId: 'user-1', service: 'server' });
  });

  it('redacts credentials at the top level, when nested, and in headers', () => {
    const { logger, logs } = captureLogger();
    logger.info({
      password: 'Str0ngPass',
      refreshToken: 'refresh-value',
      input: { password: 'Str0ngPass', accessToken: 'access-value', email: 'kept@example.com' },
      headers: { authorization: 'Bearer abc', cookie: 'refresh_token=abc', accept: '*/*' },
    });
    const serialized = JSON.stringify(logs[0]);
    for (const secret of ['Str0ngPass', 'refresh-value', 'access-value', 'Bearer abc', '=abc']) {
      expect(serialized).not.toContain(secret);
    }
    expect(logs[0]).toMatchObject({
      password: '[redacted]',
      input: { password: '[redacted]', email: 'kept@example.com' },
      headers: { authorization: '[redacted]', accept: '*/*' },
    });
  });

  it('honours the configured level', () => {
    const lines: string[] = [];
    const logger = createLogger({ LOG_LEVEL: 'error' }, { write: (line) => void lines.push(line) });
    logger.info({ event: 'ignored' });
    logger.error({ event: 'kept' });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('kept');
  });
});
