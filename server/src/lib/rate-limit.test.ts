import express from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { consumeOrThrow, createRateLimiters, rateLimitMiddleware } from './rate-limit';

const limits = { RATE_LIMIT_GENERAL_MAX: 2, RATE_LIMIT_AUTH_MAX: 3 };

describe('consumeOrThrow', () => {
  it('allows requests up to the limit, then throws RATE_LIMITED with a retry hint', async () => {
    const { auth } = createRateLimiters(limits);
    await consumeOrThrow(auth, 'client-a');
    await consumeOrThrow(auth, 'client-a');
    await consumeOrThrow(auth, 'client-a');

    await expect(consumeOrThrow(auth, 'client-a')).rejects.toMatchObject({
      message: 'RATE_LIMITED',
      extensions: { code: 'RATE_LIMITED', retryAfterSeconds: expect.any(Number) as number },
    });
  });

  it('counts each client separately', async () => {
    const { auth } = createRateLimiters({ ...limits, RATE_LIMIT_AUTH_MAX: 1 });
    await consumeOrThrow(auth, 'client-a');
    await expect(consumeOrThrow(auth, 'client-b')).resolves.toBeUndefined();
    await expect(consumeOrThrow(auth, 'client-a')).rejects.toThrow('RATE_LIMITED');
  });
});

describe('rateLimitMiddleware', () => {
  it('answers 429 in the GraphQL error shape once the limit is used up', async () => {
    const { general } = createRateLimiters(limits);
    const app = express();
    app.use(rateLimitMiddleware(general));
    app.get('/', (_req, res) => {
      res.json({ ok: true });
    });

    expect((await supertest(app).get('/')).status).toBe(200);
    expect((await supertest(app).get('/')).status).toBe(200);

    const limited = await supertest(app).get('/');
    expect(limited.status).toBe(429);
    expect(Number(limited.get('retry-after'))).toBeGreaterThan(0);
    expect(limited.body).toEqual({
      errors: [{ message: 'RATE_LIMITED', extensions: { code: 'RATE_LIMITED' } }],
    });
  });
});
