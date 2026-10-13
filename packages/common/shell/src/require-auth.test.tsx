import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { asha, sessionPayload } from '@common/auth/testing';
import { ROLES } from '@common/types';
import { RequireAuth } from './require-auth';
import { installFakeServer, renderInShell } from './test/render';

function LoginStub() {
  const location = useLocation();
  return <p>Login page, from: {JSON.stringify(location.state)}</p>;
}

function renderProtected(requiredRole?: 'admin' | 'user') {
  return renderInShell(
    <Routes>
      <Route path="/login" element={<LoginStub />} />
      <Route
        path="/reports"
        element={
          <RequireAuth {...(requiredRole ? { requiredRole } : {})}>
            <p>Secret reports</p>
          </RequireAuth>
        }
      />
    </Routes>,
    { entries: ['/reports'] },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('RequireAuth', () => {
  it('shows a progress message while the session is being checked, then the page', async () => {
    const server = installFakeServer();
    server.replySession('RefreshSession');
    renderProtected();

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session…');
    expect(screen.queryByText('Secret reports')).not.toBeInTheDocument();
    expect(await screen.findByText('Secret reports')).toBeInTheDocument();
  });

  it('sends a signed-out visitor to login and remembers where they were going', async () => {
    const server = installFakeServer();
    server.reply('RefreshSession', { errorCode: 'UNAUTHENTICATED' });
    renderProtected();

    expect(await screen.findByText('Login page, from: {"from":"/reports"}')).toBeInTheDocument();
    expect(screen.queryByText('Secret reports')).not.toBeInTheDocument();
  });

  it('lets a user with the required role in', async () => {
    const server = installFakeServer();
    server.replySession('RefreshSession');
    renderProtected(ROLES.admin);
    expect(await screen.findByText('Secret reports')).toBeInTheDocument();
  });

  it('blocks a user without the required role and offers sign-out', async () => {
    const user = userEvent.setup();
    const server = installFakeServer();
    server.replySession(
      'RefreshSession',
      sessionPayload({ user: { ...asha, roles: [ROLES.user] } }),
    );
    server.reply('Logout', { data: { logout: true } });
    renderProtected(ROLES.admin);

    expect(
      await screen.findByRole('heading', { name: 'You do not have access', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Secret reports')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText(/Login page/)).toBeInTheDocument();
    expect(server.callsTo('Logout')).toHaveLength(1);
  });
});
