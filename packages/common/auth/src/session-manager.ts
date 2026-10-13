import {
  createGraphqlClient,
  LoginDocument,
  LogoutDocument,
  RefreshSessionDocument,
  type AuthSessionFragment,
  type AuthUserFragment,
  type GraphqlClient,
} from '@common/api';
import { ERROR_CODES, getErrorCode } from '@common/error-handling';
import type { LoginValues } from '@common/validators';

export type AuthUser = AuthUserFragment;
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

/** Where a native app keeps its refresh token (the device's secure storage). */
export interface TokenStore {
  get: () => Promise<string | null>;
  set: (token: string) => Promise<void>;
  clear: () => Promise<void>;
}

interface CommonOptions {
  /** Full URL of the GraphQL endpoint. */
  url: string;
  /** Receives failures the user is not shown, such as a background refresh that could not connect. */
  onError: (error: unknown) => void;
  fetchFn?: typeof fetch;
}

export type SessionManagerOptions = CommonOptions &
  ({ platform: 'web' } | { platform: 'native'; tokenStore: TokenStore });

export interface SessionManager {
  /** GraphQL client that sends the current access token with every request. */
  client: GraphqlClient;
  getState: () => AuthState;
  subscribe: (listener: () => void) => () => void;
  /** Restores a previous session on startup. Safe to call more than once. */
  restore: () => Promise<void>;
  /** Signs in. Rejects with an `AppError` the form can show. */
  login: (values: LoginValues) => Promise<void>;
  logout: () => Promise<void>;
  dispose: () => void;
}

// Refresh a little before the access token expires so requests never race the deadline.
const REFRESH_LEEWAY_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 5_000;
const RETRY_DELAY_MS = 30_000;

/** Browsers keep the refresh token in an httpOnly cookie, so there is nothing for scripts to store. */
const cookieTokenStore: TokenStore = {
  get: () => Promise.resolve(null),
  set: () => Promise.resolve(),
  clear: () => Promise.resolve(),
};

const SIGNED_OUT: AuthState = { status: 'unauthenticated', user: null };

/**
 * Owns the signed-in session for one app: holds the access token in memory,
 * renews it before it expires, and tells subscribers when the user changes.
 * Framework-free so mWeb, portals and native share the exact same behavior.
 */
export function createSessionManager(options: SessionManagerOptions): SessionManager {
  const { platform, onError } = options;
  const store = options.platform === 'native' ? options.tokenStore : cookieTokenStore;
  const listeners = new Set<() => void>();
  let state: AuthState = { status: 'loading', user: null };
  let accessToken: string | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let refreshInFlight: Promise<void> | undefined;
  // Lets a refresh that was already in flight notice that the user signed out meanwhile.
  let signOutCount = 0;

  const client = createGraphqlClient({
    url: options.url,
    platform,
    getAccessToken: () => accessToken,
    ...(options.fetchFn ? { fetchFn: options.fetchFn } : {}),
  });

  function setState(next: AuthState): void {
    state = next;
    for (const listener of listeners) {
      listener();
    }
  }

  function scheduleRefresh(delayMs: number): void {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void refresh(), delayMs);
  }

  async function applySession(session: AuthSessionFragment): Promise<void> {
    accessToken = session.accessToken;
    if (session.refreshToken) {
      await store.set(session.refreshToken);
    }
    setState({ status: 'authenticated', user: session.user });
    const lifetimeMs = new Date(session.accessTokenExpiresAt).getTime() - Date.now();
    scheduleRefresh(Math.max(MIN_REFRESH_DELAY_MS, lifetimeMs - REFRESH_LEEWAY_MS));
  }

  async function clearSession(): Promise<void> {
    signOutCount += 1;
    accessToken = null;
    clearTimeout(refreshTimer);
    setState(SIGNED_OUT);
    await store.clear();
  }

  async function runRefresh(): Promise<void> {
    const signOutsAtStart = signOutCount;
    try {
      const refreshToken = await store.get();
      if (platform === 'native' && !refreshToken) {
        await clearSession();
        return;
      }
      const data = await client.execute(RefreshSessionDocument, { refreshToken });
      if (signOutCount === signOutsAtStart) {
        await applySession(data.refreshSession);
      }
    } catch (error) {
      if (getErrorCode(error) === ERROR_CODES.UNAUTHENTICATED) {
        // The normal "not signed in" answer, not a failure worth reporting.
        await clearSession().catch(onError);
        return;
      }
      onError(error);
      if (state.status === 'authenticated') {
        // Probably offline: keep the user signed in and try again shortly.
        scheduleRefresh(RETRY_DELAY_MS);
      } else {
        // Could not restore. The stored token is kept so the next launch can try again.
        setState(SIGNED_OUT);
      }
    }
  }

  /** Concurrent callers share one request, because a refresh token can only be redeemed once. */
  function refresh(): Promise<void> {
    refreshInFlight ??= runRefresh().finally(() => {
      refreshInFlight = undefined;
    });
    return refreshInFlight;
  }

  return {
    client,
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    restore: () => (state.status === 'loading' ? refresh() : Promise.resolve()),
    login: async (values) => {
      const data = await client.execute(LoginDocument, { input: values });
      await applySession(data.login);
    },
    logout: async () => {
      try {
        await client.execute(LogoutDocument, { refreshToken: await store.get() });
      } catch (error) {
        // The user is still signed out here; the server session simply lives until it expires.
        onError(error);
      } finally {
        await clearSession();
      }
    },
    dispose: () => {
      clearTimeout(refreshTimer);
      listeners.clear();
    },
  };
}
