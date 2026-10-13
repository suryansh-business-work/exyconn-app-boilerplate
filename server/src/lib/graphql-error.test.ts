import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';
import { loginSchema } from '@common/validators';
import { formatError, graphqlError, parseInput } from './graphql-error';

describe('graphqlError', () => {
  it('uses the code as message and extension, and keeps extra extensions', () => {
    const error = graphqlError('RATE_LIMITED', { retryAfterSeconds: 30 });
    expect(error).toBeInstanceOf(GraphQLError);
    expect(error.message).toBe('RATE_LIMITED');
    expect(error.extensions).toEqual({ code: 'RATE_LIMITED', retryAfterSeconds: 30 });
  });

  it('does not let extra extensions override the code', () => {
    expect(graphqlError('FORBIDDEN', { code: 'SOMETHING_ELSE' }).extensions.code).toBe('FORBIDDEN');
  });
});

describe('parseInput', () => {
  it('returns the parsed, normalized value', () => {
    expect(parseInput(loginSchema, { email: ' A@B.io ', password: 'secret' })).toEqual({
      email: 'a@b.io',
      password: 'secret',
    });
  });

  it('throws BAD_USER_INPUT with the first message key per field', () => {
    let thrown: unknown;
    try {
      parseInput(loginSchema, { email: 'nope', password: '' });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(GraphQLError);
    expect((thrown as GraphQLError).extensions).toEqual({
      code: 'BAD_USER_INPUT',
      fieldErrors: {
        email: 'validation.emailInvalid',
        password: 'validation.passwordRequired',
      },
    });
  });

  it('rejects input of the wrong shape', () => {
    expect(() => parseInput(loginSchema, null)).toThrow('BAD_USER_INPUT');
  });
});

describe('formatError', () => {
  it('passes known errors through without internal details', () => {
    expect(
      formatError({
        message: 'BAD_USER_INPUT',
        path: ['login'],
        extensions: {
          code: 'BAD_USER_INPUT',
          fieldErrors: { email: 'validation.emailInvalid' },
          stacktrace: ['at secret/internal/path.ts'],
        },
      }),
    ).toEqual({
      message: 'BAD_USER_INPUT',
      path: ['login'],
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { email: 'validation.emailInvalid' } },
    });
  });

  it('reports malformed requests as bad input', () => {
    expect(
      formatError({
        message: 'Cannot query field "nope" on type "Query".',
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      }),
    ).toEqual({
      message: 'Cannot query field "nope" on type "Query".',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it.each([
    ['an explicit internal error', { code: 'INTERNAL_SERVER_ERROR' }],
    ['an unrecognized code', { code: 'E11000' }],
    ['no code at all', undefined],
  ])('masks %s', (_label, extensions) => {
    expect(
      formatError({
        message: 'connect ECONNREFUSED mongodb://admin:hunter2@db:27017',
        path: ['me'],
        ...(extensions ? { extensions } : {}),
      }),
    ).toEqual({
      message: 'INTERNAL_SERVER_ERROR',
      path: ['me'],
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  });
});
