import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import type { ZodType } from 'zod';
import { ERROR_CODES, isErrorCode, type ErrorCode } from '@common/error-handling';

export function graphqlError(
  code: ErrorCode,
  extensions: Record<string, unknown> = {},
): GraphQLError {
  return new GraphQLError(code, { extensions: { ...extensions, code } });
}

/** Validates resolver input, reporting each invalid field as a localization key. */
export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join('.');
    fieldErrors[field] ??= issue.message;
  }
  throw graphqlError(ERROR_CODES.BAD_USER_INPUT, { fieldErrors });
}

// Errors Apollo raises for requests that are malformed before any resolver runs.
const REQUEST_ERROR_CODES = new Set([
  'GRAPHQL_PARSE_FAILED',
  'GRAPHQL_VALIDATION_FAILED',
  'BAD_REQUEST',
  'OPERATION_RESOLUTION_FAILURE',
  'PERSISTED_QUERY_NOT_FOUND',
  'PERSISTED_QUERY_NOT_SUPPORTED',
]);

/** Shapes every error sent to clients: known codes pass through, anything unexpected is masked. */
export function formatError(formatted: GraphQLFormattedError): GraphQLFormattedError {
  const code = formatted.extensions?.code;
  const location = formatted.path ? { path: formatted.path } : {};
  if (isErrorCode(code) && code !== ERROR_CODES.INTERNAL_SERVER_ERROR) {
    const fieldErrors = formatted.extensions?.fieldErrors;
    return {
      message: formatted.message,
      ...location,
      extensions: { code, ...(fieldErrors ? { fieldErrors } : {}) },
    };
  }
  if (typeof code === 'string' && REQUEST_ERROR_CODES.has(code)) {
    return { message: formatted.message, extensions: { code: ERROR_CODES.BAD_USER_INPUT } };
  }
  return {
    message: ERROR_CODES.INTERNAL_SERVER_ERROR,
    ...location,
    extensions: { code: ERROR_CODES.INTERNAL_SERVER_ERROR },
  };
}
