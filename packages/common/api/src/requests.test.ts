import { describe, expect, it, vi } from 'vitest';
import { createGraphqlClient, fetchTranslations, sendClientErrorReport } from './index';

function clientReplying(body: unknown) {
  const fetchFn = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body))));
  const client = createGraphqlClient({
    url: 'https://api.example.test/graphql',
    platform: 'web',
    fetchFn,
  });
  const sentVariables = (): unknown => {
    const body = fetchFn.mock.calls[0]?.[1]?.body;
    return typeof body === 'string'
      ? (JSON.parse(body) as { variables: unknown }).variables
      : undefined;
  };
  return { client, sentVariables };
}

describe('fetchTranslations', () => {
  it('returns the translations as a key-to-text map for the requested locale', async () => {
    const { client, sentVariables } = clientReplying({
      data: {
        translations: [
          { key: 'auth.login.submit', value: 'Log in' },
          { key: 'auth.logout', value: 'Log out' },
        ],
      },
    });
    await expect(fetchTranslations(client, 'en-IN')).resolves.toEqual({
      'auth.login.submit': 'Log in',
      'auth.logout': 'Log out',
    });
    expect(sentVariables()).toEqual({ locale: 'en-IN' });
  });

  it('returns an empty map when the locale has no translations', async () => {
    const { client } = clientReplying({ data: { translations: [] } });
    await expect(fetchTranslations(client, 'hi')).resolves.toEqual({});
  });

  it('rejects with the server error', async () => {
    const { client } = clientReplying({
      errors: [{ message: 'BAD_USER_INPUT', extensions: { code: 'BAD_USER_INPUT' } }],
    });
    await expect(fetchTranslations(client, 'nope')).rejects.toMatchObject({
      code: 'BAD_USER_INPUT',
    });
  });
});

describe('sendClientErrorReport', () => {
  const report = { name: 'TypeError', message: 'x is undefined', location: '/users' };

  it('sends the report as the mutation input', async () => {
    const { client, sentVariables } = clientReplying({ data: { reportClientError: true } });
    await expect(sendClientErrorReport(client, report)).resolves.toBeUndefined();
    expect(sentVariables()).toEqual({ input: report });
  });

  it('rejects when the server refuses the report', async () => {
    const { client } = clientReplying({
      errors: [{ message: 'RATE_LIMITED', extensions: { code: 'RATE_LIMITED' } }],
    });
    await expect(sendClientErrorReport(client, report)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });
});
