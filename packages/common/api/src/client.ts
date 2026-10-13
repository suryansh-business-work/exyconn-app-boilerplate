import { AppError, ERROR_CODES, isErrorCode } from '@common/error-handling';
import { CLIENT_PLATFORM_HEADER, type ClientPlatform } from '@common/types';
import type { TypedDocumentString } from './generated/graphql';

export interface GraphqlClientOptions {
  /** Full URL of the GraphQL endpoint. */
  url: string;
  platform: ClientPlatform;
  /** Returns the current access token, or null when signed out. */
  getAccessToken?: () => string | null;
  fetchFn?: typeof fetch;
}

/** Variables are required only when the operation declares a required variable. */
type VariablesArgs<TVariables> =
  Record<string, never> extends TVariables ? [variables?: TVariables] : [variables: TVariables];

export interface GraphqlClient {
  execute<TResult, TVariables>(
    document: TypedDocumentString<TResult, TVariables>,
    ...args: VariablesArgs<TVariables>
  ): Promise<TResult>;
}

interface GraphqlResponseBody {
  data?: unknown;
  errors?: { message?: unknown; extensions?: { code?: unknown } }[];
}

function isResponseBody(value: unknown): value is GraphqlResponseBody {
  return typeof value === 'object' && value !== null && ('data' in value || 'errors' in value);
}

async function readBody(response: Response): Promise<GraphqlResponseBody> {
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new AppError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      `Unreadable response (HTTP ${response.status})`,
      { cause: error },
    );
  }
  if (!isResponseBody(body)) {
    throw new AppError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      `Unexpected response (HTTP ${response.status})`,
    );
  }
  return body;
}

/**
 * Minimal typed GraphQL client shared by web and native. Every failure is
 * raised as an `AppError`, so callers map one error type to a user message.
 */
export function createGraphqlClient(options: GraphqlClientOptions): GraphqlClient {
  const { url, platform, getAccessToken } = options;
  const fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));

  return {
    async execute<TResult, TVariables>(
      document: TypedDocumentString<TResult, TVariables>,
      ...[variables]: VariablesArgs<TVariables>
    ): Promise<TResult> {
      const accessToken = getAccessToken?.();
      let response: Response;
      try {
        response = await fetchFn(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [CLIENT_PLATFORM_HEADER]: platform,
            ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
          },
          // Browsers hold the refresh token in an httpOnly cookie; native apps send it explicitly.
          credentials: platform === 'web' ? 'include' : 'omit',
          body: JSON.stringify({ query: document.toString(), variables }),
        });
      } catch (error) {
        throw new AppError(ERROR_CODES.NETWORK_ERROR, undefined, { cause: error });
      }

      const body = await readBody(response);
      const firstError = body.errors?.[0];
      if (firstError) {
        const code = firstError.extensions?.code;
        throw new AppError(
          isErrorCode(code) ? code : ERROR_CODES.INTERNAL_SERVER_ERROR,
          typeof firstError.message === 'string' ? firstError.message : undefined,
        );
      }
      if (body.data === undefined || body.data === null) {
        throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Response contained no data');
      }
      // The document's result type is generated from the same schema the server validates against.
      return body.data as TResult;
    },
  };
}
