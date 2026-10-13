import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@common/error-handling';
import { AdminDashboardDocument, createGraphqlClient, LoginDocument } from './index';

const URL = 'https://api.example.test/graphql';
const input = { email: 'asha@example.com', password: 'Str0ngPass' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function setup(
  response: Response | Error,
  options: { platform?: 'web' | 'native'; token?: string | null } = {},
) {
  const fetchFn = vi.fn<typeof fetch>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  const client = createGraphqlClient({
    url: URL,
    platform: options.platform ?? 'web',
    getAccessToken: () => options.token ?? null,
    fetchFn,
  });
  const sentInit = (): RequestInit => fetchFn.mock.calls[0]?.[1] ?? {};
  const sentBody = (): unknown => {
    const { body } = sentInit();
    return typeof body === 'string' ? JSON.parse(body) : undefined;
  };
  const sentHeaders = (): Record<string, string> => sentInit().headers as Record<string, string>;
  return { client, fetchFn, sentInit, sentBody, sentHeaders };
}

async function catchError(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AppError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected the request to fail');
}

describe('createGraphqlClient', () => {
  it('posts the document and variables and returns the data', async () => {
    const data = { adminDashboard: { totalUsers: 7 } };
    const { client, fetchFn, sentInit, sentBody } = setup(jsonResponse({ data }));

    await expect(client.execute(AdminDashboardDocument)).resolves.toEqual(data);
    expect(fetchFn).toHaveBeenCalledExactlyOnceWith(URL, expect.any(Object));
    expect(sentInit().method).toBe('POST');
    expect(sentBody()).toEqual({
      query: AdminDashboardDocument.toString(),
    });
  });

  it('sends variables when the operation has them', async () => {
    const { client, sentBody } = setup(jsonResponse({ data: { login: {} } }));
    await client.execute(LoginDocument, { input });
    expect(sentBody()).toMatchObject({ variables: { input } });
  });

  it('identifies as web and includes cookies, without an authorization header when signed out', async () => {
    const { client, sentInit, sentHeaders } = setup(jsonResponse({ data: {} }));
    await client.execute(AdminDashboardDocument);
    expect(sentInit().credentials).toBe('include');
    expect(sentHeaders()['x-client-platform']).toBe('web');
    expect(sentHeaders()).not.toHaveProperty('authorization');
  });

  it('identifies as native, omits cookies and sends the bearer token when signed in', async () => {
    const { client, sentInit, sentHeaders } = setup(jsonResponse({ data: {} }), {
      platform: 'native',
      token: 'access-token',
    });
    await client.execute(AdminDashboardDocument);
    expect(sentInit().credentials).toBe('omit');
    expect(sentHeaders()['x-client-platform']).toBe('native');
    expect(sentHeaders().authorization).toBe('Bearer access-token');
  });

  it('raises the server error code as an AppError', async () => {
    const { client } = setup(
      jsonResponse({
        data: null,
        errors: [{ message: 'INVALID_CREDENTIALS', extensions: { code: 'INVALID_CREDENTIALS' } }],
      }),
    );
    const error = await catchError(client.execute(LoginDocument, { input }));
    expect(error.code).toBe('INVALID_CREDENTIALS');
  });

  it('reads the error code from a non-200 response such as a rate limit', async () => {
    const { client } = setup(
      jsonResponse(
        { errors: [{ message: 'RATE_LIMITED', extensions: { code: 'RATE_LIMITED' } }] },
        429,
      ),
    );
    expect((await catchError(client.execute(AdminDashboardDocument))).code).toBe('RATE_LIMITED');
  });

  it.each([
    ['an unknown code', { errors: [{ message: 'x', extensions: { code: 'WEIRD' } }] }],
    ['no extensions', { errors: [{ message: 'x' }] }],
    ['null data without errors', { data: null }],
    ['a body that is not a GraphQL response', { ok: true }],
  ])('treats %s as an internal error', async (_label, body) => {
    const { client } = setup(jsonResponse(body));
    expect((await catchError(client.execute(AdminDashboardDocument))).code).toBe(
      'INTERNAL_SERVER_ERROR',
    );
  });

  it('treats a non-JSON response (such as a proxy error page) as an internal error', async () => {
    const { client } = setup(new Response('<html>Bad Gateway</html>', { status: 502 }));
    const error = await catchError(client.execute(AdminDashboardDocument));
    expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(error.message).toContain('502');
  });

  it('reports a failed connection as a network error and keeps the cause', async () => {
    const cause = new TypeError('Failed to fetch');
    const { client } = setup(cause);
    const error = await catchError(client.execute(AdminDashboardDocument));
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.cause).toBe(cause);
  });
});
