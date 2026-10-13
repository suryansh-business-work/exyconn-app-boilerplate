import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createRefreshToken, hashRefreshToken, signAccessToken, verifyAccessToken } from './tokens';

const env = { JWT_ACCESS_SECRET: randomBytes(32).toString('hex'), ACCESS_TOKEN_TTL_SECONDS: 900 };
const otherEnv = { ...env, JWT_ACCESS_SECRET: randomBytes(32).toString('hex') };

describe('access tokens', () => {
  it('round-trips the user id', async () => {
    const { token } = await signAccessToken('user-1', env);
    expect(token.split('.')).toHaveLength(3);
    expect(await verifyAccessToken(token, env)).toBe('user-1');
  });

  it('reports an expiry that is the configured lifetime after issue', async () => {
    const issuedAt = new Date('2026-01-01T00:00:00.000Z');
    const { expiresAt } = await signAccessToken('user-1', env, issuedAt);
    expect(expiresAt.toISOString()).toBe('2026-01-01T00:15:00.000Z');
  });

  it('rejects an expired token', async () => {
    const longAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { token } = await signAccessToken('user-1', env, longAgo);
    expect(await verifyAccessToken(token, env)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const { token } = await signAccessToken('user-1', otherEnv);
    expect(await verifyAccessToken(token, env)).toBeNull();
  });

  it('rejects a token whose payload was altered', async () => {
    const { token } = await signAccessToken('user-1', env);
    const [header, , signature] = token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + 900 }),
    ).toString('base64url');
    expect(await verifyAccessToken(`${header}.${forgedPayload}.${signature}`, env)).toBeNull();
  });

  it('rejects an unsigned token and garbage', async () => {
    const unsignedHeader = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'user-1' })).toString('base64url');
    expect(await verifyAccessToken(`${unsignedHeader}.${payload}.`, env)).toBeNull();
    expect(await verifyAccessToken('not-a-token', env)).toBeNull();
    expect(await verifyAccessToken('', env)).toBeNull();
  });
});

describe('refresh tokens', () => {
  it('creates unpredictable tokens and stores only a matching hash', () => {
    const first = createRefreshToken();
    const second = createRefreshToken();
    expect(first.token).not.toBe(second.token);
    expect(first.token.length).toBeGreaterThanOrEqual(64);
    expect(first.tokenHash).toBe(hashRefreshToken(first.token));
    expect(first.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.tokenHash).not.toContain(first.token);
  });
});
