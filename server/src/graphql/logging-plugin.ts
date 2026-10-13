import type { ApolloServerPlugin } from '@apollo/server';
import { ERROR_CODES, isErrorCode, sanitizeError } from '@common/error-handling';
import type { Logger } from '../lib/logger';
import type { GraphqlContext } from './context';

/** Logs one line per operation, plus full (redacted) detail for errors nobody anticipated. */
export function loggingPlugin(logger: Logger): ApolloServerPlugin<GraphqlContext> {
  return {
    async requestDidStart() {
      const startedAt = performance.now();
      return {
        async didEncounterErrors({ errors, operationName }) {
          for (const error of errors) {
            const code = error.extensions.code;
            if (!isErrorCode(code) || code === ERROR_CODES.INTERNAL_SERVER_ERROR) {
              logger.error({
                event: 'graphql.unexpectedError',
                operationName: operationName ?? null,
                error: sanitizeError(error.originalError ?? error),
              });
            }
          }
        },
        async willSendResponse({ operationName, errors }) {
          logger.info({
            event: 'graphql.request',
            operationName: operationName ?? null,
            durationMs: Math.round(performance.now() - startedAt),
            errorCodes: (errors ?? []).map((error) => error.extensions.code),
          });
        },
      };
    },
  };
}
