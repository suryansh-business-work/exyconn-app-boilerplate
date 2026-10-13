import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@common/error-handling';
import { createSessionManager, type TokenStore } from './session-manager';
import { asha, createFakeServer, sessionPayload, type FakeServer } from './test/fake-server';

const URL = 'https://api.example.test/graphql';
const credentials = { email: 'asha@example.com', password: 'Str0ngPass' };

function memoryStore(initial: string | null = null): TokenStore & { value: string | null } {
  const store = {
    value: initial,
    get: () => Promise.resolve(store.value),
    set: (token: string) => {
      store.value = token;
      return Promise.resolve();
    },
    clear: () => {
      store.value = null;
      return Promise.resolve();
    },
  };
  return store;
}

let server: FakeServer;
let onError: ReturnType<typeof vi.fn<(error: unknown) => void>>;

beforeEach(() => {
  vi.useFakeTimers();
  server = createFakeServer();
  onError = vi.fn<(error: unknown) => void>();
});

afterEach(() => {
  vi.useRealTimers();
});

function webSession() {
  return createSessionManager({ url: URL, platform: 'web', onError, fetchFn: server.fetchFn });
}

function nativeSession(tokenStore: TokenStore) {
  return createSessionManager({
    url: URL,
    platform: 'native',
    tokenStore,
    onError,
    fetchFn: server.fetchFn,
  });
}

describe('restore', () => {
  it('starts in the loading state', () => {
    expect(webSession().getState()).toEqual({ status: 'loading', user: null });
  });

  it('signs the web user in when the cookie is still valid', async () => {
    server.replySession('RefreshSession');
    const session = webSession();
    await session.restore();
    expect(session.getState()).toEqual({ status: 'authenticated', user: asha });
    expect(server.callsTo('RefreshSession')[0]?.variables).toEqual({ refreshToken: null });
  });

  it('ends signed out, without reporting an error, when there is no session', async () => {
    server.reply('RefreshSession', { errorCode: 'UNAUTHENTICATED' });
    const session = webSession();
    await session.restore();
    expect(session.getState()).toEqual({ status: 'unauthenticated', user: null });
    expect(onError).not.toHaveBeenCalled();
  });

  it('skips the network on native when no token is stored', async () => {
    const session = nativeSession(memoryStore());
    await session.restore();
    expect(session.getState().status).toBe('unauthenticated');
    expect(server.calls).toHaveLength(0);
  });

  it('sends the stored token on native and saves the rotated one', async () => {
    const store = memoryStore('refresh-1');
    server.replySession('RefreshSession', sessionPayload({ refreshToken: 'refresh-2' }));
    const session = nativeSession(store);
    await session.restore();
    expect(server.callsTo('RefreshSession')[0]?.variables).toEqual({ refreshToken: 'refresh-1' });
    expect(store.value).toBe('refresh-2');
    expect(session.getState().status).toBe('authenticated');
  });

  it('makes one request when called twice at once, as React StrictMode does', async () => {
    server.replySession('RefreshSession');
    const session = webSession();
    await Promise.all([session.restore(), session.restore()]);
    expect(server.callsTo('RefreshSession')).toHaveLength(1);
    expect(session.getState().status).toBe('authenticated');
  });

  it('does nothing once the session is already resolved', async () => {
    server.replySession('RefreshSession');
    const session = webSession();
    await session.restore();
    await session.restore();
    expect(server.callsTo('RefreshSession')).toHaveLength(1);
  });

  it('shows sign-in but keeps the stored token when the server cannot be reached', async () => {
    const store = memoryStore('refresh-1');
    server.reply('RefreshSession', { networkError: new TypeError('Network request failed') });
    const session = nativeSession(store);
    await session.restore();
    expect(session.getState().status).toBe('unauthenticated');
    expect(store.value).toBe('refresh-1');
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ code: 'NETWORK_ERROR' }),
    );
  });

  it('reports a failing token store and ends signed out', async () => {
    const failure = new Error('keychain locked');
    const session = nativeSession({ ...memoryStore(), get: () => Promise.reject(failure) });
    await session.restore();
    expect(session.getState().status).toBe('unauthenticated');
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
  });
});

describe('login', () => {
  it('signs in, notifies subscribers and authorizes later requests', async () => {
    server.replySession('Login', sessionPayload({ accessToken: 'access-login' }));
    server.reply('Logout', { data: { logout: true } });
    const session = webSession();
    const listener = vi.fn();
    session.subscribe(listener);

    await session.login(credentials);

    expect(session.getState()).toEqual({ status: 'authenticated', user: asha });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(server.callsTo('Login')[0]).toMatchObject({
      variables: { input: credentials },
      authorization: undefined,
    });

    await session.logout();
    expect(server.callsTo('Logout')[0]?.authorization).toBe('Bearer access-login');
  });

  it('rejects with the server error and stays signed out', async () => {
    server.reply('Login', { errorCode: 'INVALID_CREDENTIALS' });
    const session = webSession();
    const listener = vi.fn();
    session.subscribe(listener);

    await expect(session.login(credentials)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(session.getState().status).toBe('loading');
    expect(listener).not.toHaveBeenCalled();
  });

  it('stores the refresh token on native', async () => {
    const store = memoryStore();
    server.replySession('Login', sessionPayload({ refreshToken: 'refresh-1' }));
    await nativeSession(store).login(credentials);
    expect(store.value).toBe('refresh-1');
  });

  it('stops notifying a listener after it unsubscribes', async () => {
    server.replySession('Login');
    const session = webSession();
    const listener = vi.fn();
    session.subscribe(listener)();
    await session.login(credentials);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('background refresh', () => {
  it('renews the session one minute before the access token expires', async () => {
    server.replySession('Login');
    server.replySession('RefreshSession', sessionPayload({ accessToken: 'access-2' }));
    server.reply('Logout', { data: { logout: true } });
    const session = webSession();
    await session.login(credentials);

    await vi.advanceTimersByTimeAsync(14 * 60_000 - 1);
    expect(server.callsTo('RefreshSession')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(server.callsTo('RefreshSession')).toHaveLength(1);

    await session.logout();
    expect(server.callsTo('Logout')[0]?.authorization).toBe('Bearer access-2');
  });

  it('waits at least five seconds even when the token is about to expire', async () => {
    server.replySession(
      'Login',
      sessionPayload({ accessTokenExpiresAt: new Date(Date.now() + 1000).toISOString() }),
    );
    server.replySession('RefreshSession');
    const session = webSession();
    await session.login(credentials);

    await vi.advanceTimersByTimeAsync(4999);
    expect(server.callsTo('RefreshSession')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(server.callsTo('RefreshSession')).toHaveLength(1);
  });

  it('signs the user out when the server no longer accepts the session', async () => {
    const store = memoryStore();
    server.replySession('Login', sessionPayload({ refreshToken: 'refresh-1' }));
    server.reply('RefreshSession', { errorCode: 'UNAUTHENTICATED' });
    const session = nativeSession(store);
    await session.login(credentials);

    await vi.advanceTimersByTimeAsync(14 * 60_000);
    expect(session.getState()).toEqual({ status: 'unauthenticated', user: null });
    expect(store.value).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps the user signed in through a connection failure and retries after 30 seconds', async () => {
    server.replySession('Login');
    server.reply('RefreshSession', { networkError: new TypeError('offline') });
    server.replySession('RefreshSession');
    const session = webSession();
    await session.login(credentials);

    await vi.advanceTimersByTimeAsync(14 * 60_000);
    expect(session.getState().status).toBe('authenticated');
    expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(AppError));

    await vi.advanceTimersByTimeAsync(29_999);
    expect(server.callsTo('RefreshSession')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(server.callsTo('RefreshSession')).toHaveLength(2);
    expect(session.getState().status).toBe('authenticated');
  });

  it('stops refreshing after dispose', async () => {
    server.replySession('Login');
    const session = webSession();
    await session.login(credentials);
    session.dispose();
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(server.callsTo('RefreshSession')).toHaveLength(0);
  });
});

describe('logout', () => {
  it('revokes the session on the server and clears local state', async () => {
    const store = memoryStore();
    server.replySession('Login', sessionPayload({ refreshToken: 'refresh-1' }));
    server.reply('Logout', { data: { logout: true } });
    const session = nativeSession(store);
    await session.login(credentials);

    await session.logout();

    expect(server.callsTo('Logout')[0]?.variables).toEqual({ refreshToken: 'refresh-1' });
    expect(session.getState()).toEqual({ status: 'unauthenticated', user: null });
    expect(store.value).toBeNull();
  });

  it('still signs out locally, and reports it, when the server cannot be reached', async () => {
    server.replySession('Login');
    server.reply('Logout', { networkError: new TypeError('offline') });
    const session = webSession();
    await session.login(credentials);

    await session.logout();

    expect(session.getState().status).toBe('unauthenticated');
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ code: 'NETWORK_ERROR' }),
    );
  });

  it('cancels the scheduled refresh', async () => {
    server.replySession('Login');
    server.reply('Logout', { data: { logout: true } });
    const session = webSession();
    await session.login(credentials);
    await session.logout();
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(server.callsTo('RefreshSession')).toHaveLength(0);
  });

  it('is not undone by a refresh that was already in flight', async () => {
    let finishRefresh: ((response: Response) => void) | undefined;
    const slowFetch: typeof fetch = (input, init) => {
      if (typeof init?.body === 'string' && init.body.includes('mutation RefreshSession')) {
        return new Promise<Response>((resolve) => {
          finishRefresh = resolve;
        });
      }
      return server.fetchFn(input, init);
    };
    server.reply('Logout', { data: { logout: true } });
    const session = createSessionManager({
      url: URL,
      platform: 'web',
      onError,
      fetchFn: slowFetch,
    });

    const restoring = session.restore();
    await vi.advanceTimersByTimeAsync(0);
    await session.logout();
    finishRefresh?.(new Response(JSON.stringify({ data: { refreshSession: sessionPayload() } })));
    await restoring;

    expect(session.getState()).toEqual({ status: 'unauthenticated', user: null });
  });
});
