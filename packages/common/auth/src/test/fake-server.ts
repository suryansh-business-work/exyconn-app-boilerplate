import type { AuthSessionFragment } from '@common/api';

/** Test support: an in-memory stand-in for the GraphQL API, shared by every client test suite. */

export const asha = {
  id: 'user-1',
  email: 'asha@example.com',
  name: 'Asha Rao',
  roles: ['admin'],
};

export function sessionPayload(overrides: Partial<AuthSessionFragment> = {}): AuthSessionFragment {
  return {
    accessToken: 'access-1',
    accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    refreshToken: null,
    user: asha,
    ...overrides,
  };
}

export type FakeReply = { data: unknown } | { errorCode: string } | { networkError: Error };

interface RecordedCall {
  operation: string;
  variables: Record<string, unknown>;
  authorization: string | undefined;
}

interface RequestBody {
  query: string;
  variables?: Record<string, unknown>;
}

const OPERATION_NAME = /(?:query|mutation)\s+(\w+)/;

/**
 * Each operation answers with the next queued reply, so a test scripts exactly
 * what the server says and in what order. An operation with nothing queued
 * fails the request, which surfaces calls a test did not expect.
 */
export function createFakeServer() {
  const queues = new Map<string, FakeReply[]>();
  const calls: RecordedCall[] = [];

  function reply(operation: string, next: FakeReply): void {
    queues.set(operation, [...(queues.get(operation) ?? []), next]);
  }

  const fetchFn: typeof fetch = (_input, init) => {
    const body = JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as RequestBody;
    const operation = OPERATION_NAME.exec(body.query)?.[1];
    if (!operation) {
      return Promise.reject(new Error(`Unnamed operation: ${body.query}`));
    }
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({
      operation,
      variables: body.variables ?? {},
      authorization: headers.authorization,
    });
    const next = queues.get(operation)?.shift();
    if (!next) {
      return Promise.reject(new Error(`No reply queued for ${operation}`));
    }
    if ('networkError' in next) {
      return Promise.reject(next.networkError);
    }
    const payload =
      'errorCode' in next
        ? { errors: [{ message: next.errorCode, extensions: { code: next.errorCode } }] }
        : { data: next.data };
    return Promise.resolve(new Response(JSON.stringify(payload)));
  };

  return {
    fetchFn,
    calls,
    callsTo: (operation: string) => calls.filter((call) => call.operation === operation),
    reply,
    replySession: (operation: 'Login' | 'RefreshSession', session = sessionPayload()) => {
      const field = operation === 'Login' ? 'login' : 'refreshSession';
      reply(operation, { data: { [field]: session } });
    },
  };
}

export type FakeServer = ReturnType<typeof createFakeServer>;
