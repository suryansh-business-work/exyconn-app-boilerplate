import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboardDocument } from '@common/api';
import { AuthProvider, useApiClient, useAuth } from './react';
import { createSessionManager, type SessionManager } from './session-manager';
import { createFakeServer, sessionPayload, type FakeServer } from './test/fake-server';

const credentials = { email: 'asha@example.com', password: 'Str0ngPass' };

let server: FakeServer;
let session: SessionManager;

beforeEach(() => {
  server = createFakeServer();
  session = createSessionManager({
    url: 'https://api.example.test/graphql',
    platform: 'web',
    onError: vi.fn(),
    fetchFn: server.fetchFn,
  });
});

afterEach(() => {
  session.dispose();
  vi.restoreAllMocks();
});

function Account() {
  const { status, user, login, logout } = useAuth();
  return (
    <div>
      <p>status: {status}</p>
      <p>user: {user?.name ?? 'nobody'}</p>
      <button type="button" onClick={() => void login(credentials)}>
        Sign in
      </button>
      <button type="button" onClick={() => void logout()}>
        Sign out
      </button>
    </div>
  );
}

describe('AuthProvider and useAuth', () => {
  it('shows loading, then the restored user', async () => {
    server.replySession('RefreshSession');
    render(
      <AuthProvider session={session}>
        <Account />
      </AuthProvider>,
    );
    expect(screen.getByText('status: loading')).toBeInTheDocument();
    expect(await screen.findByText('status: authenticated')).toBeInTheDocument();
    expect(screen.getByText('user: Asha Rao')).toBeInTheDocument();
  });

  it('restores only once under StrictMode, which mounts effects twice', async () => {
    server.replySession('RefreshSession');
    render(
      <StrictMode>
        <AuthProvider session={session}>
          <Account />
        </AuthProvider>
      </StrictMode>,
    );
    expect(await screen.findByText('status: authenticated')).toBeInTheDocument();
    expect(server.callsTo('RefreshSession')).toHaveLength(1);
  });

  it('re-renders when the user signs in and out', async () => {
    const user = userEvent.setup();
    server.reply('RefreshSession', { errorCode: 'UNAUTHENTICATED' });
    server.replySession('Login');
    server.reply('Logout', { data: { logout: true } });
    render(
      <AuthProvider session={session}>
        <Account />
      </AuthProvider>,
    );
    expect(await screen.findByText('status: unauthenticated')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('user: Asha Rao')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('user: nobody')).toBeInTheDocument();
    expect(screen.getByText('status: unauthenticated')).toBeInTheDocument();
  });

  it('fails with a clear message when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Account />)).toThrow(
      'useAuth and useApiClient must be used inside an AuthProvider',
    );
  });
});

describe('useApiClient', () => {
  it("returns a client that sends the signed-in user's access token", async () => {
    server.replySession('RefreshSession', sessionPayload({ accessToken: 'access-restored' }));
    server.reply('AdminDashboard', { data: { adminDashboard: { totalUsers: 3 } } });

    function Total() {
      const client = useApiClient();
      const { status } = useAuth();
      return (
        <button type="button" onClick={() => void client.execute(AdminDashboardDocument)}>
          Load as {status}
        </button>
      );
    }
    const user = userEvent.setup();
    render(
      <AuthProvider session={session}>
        <Total />
      </AuthProvider>,
    );
    await user.click(await screen.findByRole('button', { name: 'Load as authenticated' }));
    expect(server.callsTo('AdminDashboard')[0]?.authorization).toBe('Bearer access-restored');
  });
});
