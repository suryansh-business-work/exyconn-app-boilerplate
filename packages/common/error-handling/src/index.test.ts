import { describe, expect, it } from 'vitest';
import {
  AppError,
  ERROR_CODES,
  getErrorCode,
  isErrorCode,
  redactSensitive,
  sanitizeError,
  toMessageKey,
} from './index';

describe('AppError', () => {
  it('carries its code and defaults the message to the code', () => {
    const error = new AppError(ERROR_CODES.FORBIDDEN);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('FORBIDDEN');
    expect(error.name).toBe('AppError');
  });

  it('keeps a custom message and cause', () => {
    const cause = new Error('socket hang up');
    const error = new AppError(ERROR_CODES.NETWORK_ERROR, 'offline', { cause });
    expect(error.message).toBe('offline');
    expect(error.cause).toBe(cause);
  });
});

describe('isErrorCode', () => {
  it('accepts known codes and rejects everything else', () => {
    expect(isErrorCode('EMAIL_TAKEN')).toBe(true);
    expect(isErrorCode('SOMETHING_ELSE')).toBe(false);
    expect(isErrorCode(undefined)).toBe(false);
    expect(isErrorCode(42)).toBe(false);
  });
});

describe('getErrorCode and toMessageKey', () => {
  it('uses the code of an AppError', () => {
    const error = new AppError(ERROR_CODES.INVALID_CREDENTIALS);
    expect(getErrorCode(error)).toBe('INVALID_CREDENTIALS');
    expect(toMessageKey(error)).toBe('errors.INVALID_CREDENTIALS');
  });

  it.each([new Error('boom'), 'boom', null, undefined, { code: 'FORBIDDEN' }])(
    'treats the unknown value %o as an internal error',
    (value) => {
      expect(getErrorCode(value)).toBe('INTERNAL_SERVER_ERROR');
      expect(toMessageKey(value)).toBe('errors.INTERNAL_SERVER_ERROR');
    },
  );
});

describe('redactSensitive', () => {
  it('removes emails, JWTs and bearer credentials but keeps the rest', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig';
    const text = `login failed for asha@example.com using ${jwt} / Bearer abc123`;
    expect(redactSensitive(text)).toBe('login failed for [redacted] using [redacted] / [redacted]');
  });

  it('leaves text without sensitive data unchanged', () => {
    expect(redactSensitive('Cannot read properties of undefined')).toBe(
      'Cannot read properties of undefined',
    );
  });
});

describe('sanitizeError', () => {
  it('redacts the message and stack of an Error', () => {
    const error = new TypeError('no user asha@example.com');
    error.stack = 'TypeError: no user asha@example.com\n    at login (auth.ts:1:1)';
    expect(sanitizeError(error)).toEqual({
      name: 'TypeError',
      message: 'no user [redacted]',
      stack: 'TypeError: no user [redacted]\n    at login (auth.ts:1:1)',
    });
  });

  it('omits the stack when the error has none', () => {
    const error = new Error('plain');
    delete error.stack;
    expect(sanitizeError(error)).toEqual({ name: 'Error', message: 'plain' });
  });

  it('truncates very long messages and stacks', () => {
    const error = new Error('m'.repeat(2000));
    error.stack = 's'.repeat(10_000);
    const sanitized = sanitizeError(error);
    expect(sanitized.message).toHaveLength(500);
    expect(sanitized.stack).toHaveLength(4000);
  });

  it('describes thrown values that are not errors', () => {
    expect(sanitizeError('bad asha@example.com')).toEqual({
      name: 'NonError',
      message: 'bad [redacted]',
    });
    expect(sanitizeError({ status: 500 })).toEqual({ name: 'NonError', message: '{"status":500}' });
    expect(sanitizeError(undefined)).toEqual({ name: 'NonError', message: 'undefined' });
  });

  it('survives values that cannot be serialized', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(sanitizeError(circular)).toEqual({ name: 'NonError', message: '[object Object]' });
  });
});
