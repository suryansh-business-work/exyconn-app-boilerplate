import { render, screen, userEvent } from '@testing-library/react-native';
import { asha, createFakeServer, sessionPayload, type FakeServer } from '@common/auth/testing';
import App from './App';

const mockStoredTokens = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStoredTokens.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStoredTokens.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockStoredTokens.delete(key);
    return Promise.resolve();
  }),
}));

const mockExtra: { apiUrl?: string } = {};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    // Read lazily: the module is loaded before this file's constants are initialised.
    get expoConfig() {
      return { version: '0.1.0', extra: mockExtra };
    },
  },
}));

const TOKEN_KEY = 'auth.refreshToken';
const originalFetch = globalThis.fetch;
let server: FakeServer;

beforeEach(() => {
  mockStoredTokens.clear();
  mockExtra.apiUrl = 'https://api.example.test/graphql';
  server = createFakeServer();
  server.reply('Translations', { data: { translations: [] } });
  globalThis.fetch = server.fetchFn;
  // React and the app log caught errors; keep the test output readable.
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

async function signIn(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Email address'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.press(screen.getByRole('button', { name: 'Sign in' }));
}

describe('App', () => {
  it('shows the login screen when no session is stored, without calling the server to refresh', async () => {
    await render(<App />);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeOnTheScreen();
    expect(server.callsTo('RefreshSession')).toHaveLength(0);
  });

  it('signs in, stores the refresh token securely and shows the home screen', async () => {
    server.replySession('Login', sessionPayload({ refreshToken: 'refresh-1' }));
    await render(<App />);

    await signIn('  Asha@Example.com', 'Str0ngPass');

    expect(await screen.findByText('Welcome, Asha Rao')).toBeOnTheScreen();
    expect(screen.getByText('Signed in as asha@example.com')).toBeOnTheScreen();
    expect(mockStoredTokens.get(TOKEN_KEY)).toBe('refresh-1');
    expect(server.callsTo('Login')[0]?.variables).toEqual({
      input: { email: 'asha@example.com', password: 'Str0ngPass' },
    });
  });

  it('restores a stored session on launch and goes straight to home', async () => {
    mockStoredTokens.set(TOKEN_KEY, 'refresh-1');
    server.replySession('RefreshSession', sessionPayload({ refreshToken: 'refresh-2' }));
    await render(<App />);

    expect(await screen.findByText('Welcome, Asha Rao')).toBeOnTheScreen();
    expect(server.callsTo('RefreshSession')[0]?.variables).toEqual({ refreshToken: 'refresh-1' });
    expect(mockStoredTokens.get(TOKEN_KEY)).toBe('refresh-2');
  });

  it('returns to login and forgets the token when the stored session is no longer valid', async () => {
    mockStoredTokens.set(TOKEN_KEY, 'expired');
    server.reply('RefreshSession', { errorCode: 'UNAUTHENTICATED' });
    await render(<App />);

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeOnTheScreen();
    expect(mockStoredTokens.has(TOKEN_KEY)).toBe(false);
  });

  it('signs out: revokes the session, clears the token and returns to login', async () => {
    const user = userEvent.setup();
    mockStoredTokens.set(TOKEN_KEY, 'refresh-1');
    server.replySession('RefreshSession', sessionPayload({ refreshToken: 'refresh-2' }));
    server.reply('Logout', { data: { logout: true } });
    await render(<App />);

    await user.press(await screen.findByText('Sign out'));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeOnTheScreen();
    expect(server.callsTo('Logout')[0]?.variables).toEqual({ refreshToken: 'refresh-2' });
    expect(mockStoredTokens.has(TOKEN_KEY)).toBe(false);
  });

  it('validates the form on the device and does not call the server', async () => {
    await render(<App />);
    await signIn('not-an-email', 'x');

    expect(await screen.findByText('Enter a valid email address.')).toBeOnTheScreen();
    expect(server.callsTo('Login')).toHaveLength(0);
  });

  it('requires both fields', async () => {
    const user = userEvent.setup();
    await render(<App />);
    await user.press(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email address.')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
  });

  it.each([
    ['INVALID_CREDENTIALS', 'The email or password is incorrect.'],
    ['RATE_LIMITED', 'Too many attempts. Wait a few minutes and try again.'],
  ])('explains a %s failure and stays on the login screen', async (errorCode, message) => {
    server.reply('Login', { errorCode });
    await render(<App />);
    await signIn(asha.email, 'Wr0ngPass');

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(screen.queryByText('Welcome, Asha Rao')).not.toBeOnTheScreen();
    expect(mockStoredTokens.has(TOKEN_KEY)).toBe(false);
  });

  it('explains a connection failure', async () => {
    server.reply('Login', { networkError: new TypeError('Network request failed') });
    await render(<App />);
    await signIn(asha.email, 'Str0ngPass');
    expect(
      await screen.findByText('Could not reach the server. Check your connection and try again.'),
    ).toBeOnTheScreen();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    await render(<App />);
    const password = await screen.findByLabelText('Password');
    expect(password.props.secureTextEntry).toBe(true);

    await user.press(screen.getByLabelText('Show password'));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    expect(screen.getByLabelText('Hide password')).toBeOnTheScreen();
  });

  it('shows the error screen instead of crashing when the app was built without an API URL', async () => {
    delete mockExtra.apiUrl;
    await render(<App />);
    expect(await screen.findByText('This page ran into a problem')).toBeOnTheScreen();
    expect(screen.getByText('Try again')).toBeOnTheScreen();
  });
});
