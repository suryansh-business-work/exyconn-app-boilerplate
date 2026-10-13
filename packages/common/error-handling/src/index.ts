import { EMBEDDED_BEARER_REGEX, EMBEDDED_EMAIL_REGEX, EMBEDDED_JWT_REGEX } from '@common/regex';

/** Error codes shared by the server (GraphQL `extensions.code`) and every client. */
export const ERROR_CODES = {
  BAD_USER_INPUT: 'BAD_USER_INPUT',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const KNOWN_CODES = new Set<string>(Object.values(ERROR_CODES));

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && KNOWN_CODES.has(value);
}

/** An error with a code the UI can turn into a localized message. */
export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string, options?: ErrorOptions) {
    super(message ?? code, options);
    this.name = 'AppError';
    this.code = code;
  }
}

export function getErrorCode(error: unknown): ErrorCode {
  return error instanceof AppError ? error.code : ERROR_CODES.INTERNAL_SERVER_ERROR;
}

/** Localization key for the message to show the user for this error. */
export function toMessageKey(error: unknown): string {
  return `errors.${getErrorCode(error)}`;
}

export interface SanitizedError {
  name: string;
  message: string;
  stack?: string;
}

const REDACTED = '[redacted]';
const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 4000;

/** Removes emails, JWTs and bearer credentials from text bound for logs. */
export function redactSensitive(text: string): string {
  return text
    .replaceAll(EMBEDDED_BEARER_REGEX, REDACTED)
    .replaceAll(EMBEDDED_JWT_REGEX, REDACTED)
    .replaceAll(EMBEDDED_EMAIL_REGEX, REDACTED);
}

function describeNonError(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    // Circular structures cannot be serialized; the type alone is still useful.
    return Object.prototype.toString.call(value);
  }
}

/** Turns anything thrown into a small, redacted record that is safe to log or report. */
export function sanitizeError(error: unknown): SanitizedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactSensitive(error.message).slice(0, MAX_MESSAGE_LENGTH),
      ...(error.stack ? { stack: redactSensitive(error.stack).slice(0, MAX_STACK_LENGTH) } : {}),
    };
  }
  return {
    name: 'NonError',
    message: redactSensitive(describeNonError(error)).slice(0, MAX_MESSAGE_LENGTH),
  };
}
