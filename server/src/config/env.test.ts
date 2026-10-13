import { describe, expect, it } from 'vitest';
import { loadEnv, usesSecureCookies } from './env';

const required = {
  MONGODB_URI: 'mongodb://localhost:27017/app',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('loadEnv', () => {
  it('applies defaults when only required values are present', () => {
    expect(loadEnv(required)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 4000,
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
      CORS_ORIGINS: [],
      TRUST_PROXY: 0,
      LOG_LEVEL: 'info',
    });
  });

  it('parses numbers and a comma-separated origin list', () => {
    const env = loadEnv({
      ...required,
      PORT: '8080',
      CORS_ORIGINS: ' https://a.example , https://b.example,, ',
    });
    expect(env.PORT).toBe(8080);
    expect(env.CORS_ORIGINS).toEqual(['https://a.example', 'https://b.example']);
  });

  it('treats blank seed values as not configured', () => {
    const env = loadEnv({
      ...required,
      SEED_ADMIN_NAME: '',
      SEED_ADMIN_EMAIL: '',
      SEED_ADMIN_PASSWORD: '',
    });
    expect(env.SEED_ADMIN_NAME).toBeUndefined();
    expect(env.SEED_ADMIN_EMAIL).toBeUndefined();
    expect(env.SEED_ADMIN_PASSWORD).toBeUndefined();
  });

  it('normalizes the seed admin email', () => {
    expect(loadEnv({ ...required, SEED_ADMIN_EMAIL: ' Admin@Example.com ' }).SEED_ADMIN_EMAIL).toBe(
      'admin@example.com',
    );
  });

  it.each([
    ['a missing database URI', { JWT_ACCESS_SECRET: required.JWT_ACCESS_SECRET }, 'MONGODB_URI'],
    ['a short signing secret', { ...required, JWT_ACCESS_SECRET: 'short' }, 'JWT_ACCESS_SECRET'],
    ['an out-of-range port', { ...required, PORT: '70000' }, 'PORT'],
    ['a non-numeric port', { ...required, PORT: 'abc' }, 'PORT'],
    ['an unknown environment', { ...required, NODE_ENV: 'prod' }, 'NODE_ENV'],
    ['a weak seed password', { ...required, SEED_ADMIN_PASSWORD: 'weak' }, 'SEED_ADMIN_PASSWORD'],
  ])('rejects %s and names the variable', (_label, source, variable) => {
    expect(() => loadEnv(source)).toThrow(
      new RegExp(`Invalid environment configuration: .*${variable}`),
    );
  });

  it('never echoes a secret value in the error', () => {
    const secret = 'short-secret';
    let message = '';
    try {
      loadEnv({ ...required, JWT_ACCESS_SECRET: secret });
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain('JWT_ACCESS_SECRET');
    expect(message).not.toContain(secret);
  });
});

describe('usesSecureCookies', () => {
  it.each([
    ['production', true],
    ['staging', true],
    ['development', false],
    ['test', false],
  ])('%s -> %s', (nodeEnv, expected) => {
    expect(usesSecureCookies(loadEnv({ ...required, NODE_ENV: nodeEnv }))).toBe(expected);
  });
});
