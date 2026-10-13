import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { GraphqlClient } from '@common/api';
import { toMessageKey } from '@common/error-handling';
import type { LoginValues } from '@common/validators';
import type { AuthState, SessionManager } from './session-manager';

const SessionContext = createContext<SessionManager | null>(null);

export interface AuthProviderProps {
  session: SessionManager;
  children: ReactNode;
}

/** Makes the session available to the tree and restores a previous sign-in on first render. */
export function AuthProvider({ session, children }: Readonly<AuthProviderProps>) {
  useEffect(() => {
    // `restore` reports its own failures through the session's `onError`.
    void session.restore();
  }, [session]);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

function useSession(): SessionManager {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useAuth and useApiClient must be used inside an AuthProvider');
  }
  return session;
}

export type UseAuthResult = AuthState & Pick<SessionManager, 'login' | 'logout'>;

export function useAuth(): UseAuthResult {
  const session = useSession();
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  return { ...state, login: session.login, logout: session.logout };
}

/** GraphQL client that carries the signed-in user's access token. */
export function useApiClient(): GraphqlClient {
  return useSession().client;
}

export interface UseLoginSubmitResult {
  /** Localization key of the last sign-in failure, or null when there is none. */
  errorKey: string | null;
  /** Signs in. Never rejects: a failure becomes `errorKey` for the form to show. */
  submit: (values: LoginValues) => Promise<void>;
}

/** Sign-in submit behavior shared by the web and native login screens. */
export function useLoginSubmit(): UseLoginSubmitResult {
  const { login } = useAuth();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const submit = useCallback(
    async (values: LoginValues): Promise<void> => {
      setErrorKey(null);
      try {
        await login(values);
      } catch (error) {
        // Every sign-in failure maps to a message the user can act on.
        setErrorKey(toMessageKey(error));
      }
    },
    [login],
  );

  return { errorKey, submit };
}
