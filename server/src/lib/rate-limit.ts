import type { RequestHandler } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { ERROR_CODES } from '@common/error-handling';
import type { Env } from '../config/env';
import { graphqlError } from './graphql-error';

const WINDOW_SECONDS = 15 * 60;

export interface RateLimiters {
  /** Every request to the API. */
  general: RateLimiterMemory;
  /** Sign-in, registration, token refresh and error reports: the endpoints worth abusing. */
  auth: RateLimiterMemory;
}

/**
 * Counters are kept in memory, which is correct for a single server instance.
 * Running several instances needs a shared store (rate-limiter-flexible supports MongoDB).
 */
export function createRateLimiters(
  env: Pick<Env, 'RATE_LIMIT_GENERAL_MAX' | 'RATE_LIMIT_AUTH_MAX'>,
): RateLimiters {
  return {
    general: new RateLimiterMemory({
      points: env.RATE_LIMIT_GENERAL_MAX,
      duration: WINDOW_SECONDS,
    }),
    auth: new RateLimiterMemory({ points: env.RATE_LIMIT_AUTH_MAX, duration: WINDOW_SECONDS }),
  };
}

function retryAfterSeconds(rejection: RateLimiterRes): number {
  return Math.max(1, Math.ceil(rejection.msBeforeNext / 1000));
}

/** Spends one point for the client, throwing RATE_LIMITED once the window is used up. */
export async function consumeOrThrow(limiter: RateLimiterMemory, clientKey: string): Promise<void> {
  try {
    await limiter.consume(clientKey);
  } catch (rejection) {
    if (rejection instanceof RateLimiterRes) {
      throw graphqlError(ERROR_CODES.RATE_LIMITED, {
        retryAfterSeconds: retryAfterSeconds(rejection),
      });
    }
    throw rejection;
  }
}

/** Express guard that answers in the GraphQL error shape so clients handle it like any other error. */
export function rateLimitMiddleware(limiter: RateLimiterMemory): RequestHandler {
  return async (req, res, next) => {
    try {
      await limiter.consume(req.ip ?? 'unknown');
      next();
    } catch (rejection) {
      if (!(rejection instanceof RateLimiterRes)) {
        next(rejection);
        return;
      }
      res
        .status(429)
        .set('Retry-After', String(retryAfterSeconds(rejection)))
        .json({
          errors: [
            {
              message: ERROR_CODES.RATE_LIMITED,
              extensions: { code: ERROR_CODES.RATE_LIMITED },
            },
          ],
        });
    }
  };
}
