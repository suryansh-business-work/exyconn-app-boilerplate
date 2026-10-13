import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asha, createFakeServer, sessionPayload, type FakeServer } from '@common/auth/testing';
import { ROLES } from '@common/types';
import { App } from './app';

const config = { apiUrl: 'https://api.example.test/graphql' };

let server: FakeServer;

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App config={config} />
    </MemoryRouter>,
  );
}

function replyDashboard(totalUsers: number) {
  server.reply('AdminDashboard', { data: { adminDashboard: { totalUsers } } });
}

beforeEach(() => {
  server = createFakeServer();
  server.reply('Translations', { data: { translations: [] } });
  vi.stubGlobal('fetch', server.fetchFn);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('admin portal', () => {
  it('takes a signed-out admin from the login form to the dashboard', async () => {
    const user = userEvent.setup();
    server.reply('RefreshSession', { errorCode: 'UNAUTHENTICATED' });
    server.replySession('Login', sessionPayload({ accessToken: 'access-admin' }));
    replyDashboard(1284);
    renderApp();

    await user.type(await screen.findByLabelText(/Email address/), 'asha@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'Str0ngPass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Welcome back, Asha Rao')).toBeInTheDocument();
    expect(await screen.findByText('1284')).toBeInTheDocument();
    expect(server.callsTo('AdminDashboard')[0]?.authorization).toBe('Bearer access-admin');
  });

  it('opens the dashboard directly for an admin with a valid session', async () => {
    server.replySession('RefreshSession');
    replyDashboard(0);
    renderApp();
    expect(await screen.findByText('Total users')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows a loading state until the dashboard data arrives', async () => {
    server.replySession('RefreshSession');
    replyDashboard(5);
    renderApp();
    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('refuses a signed-in user who is not an admin, without requesting admin data', async () => {
    server.replySession(
      'RefreshSession',
      sessionPayload({ user: { ...asha, roles: [ROLES.user] } }),
    );
    renderApp();
    expect(
      await screen.findByRole('heading', { name: 'You do not have access' }),
    ).toBeInTheDocument();
    expect(server.callsTo('AdminDashboard')).toHaveLength(0);
  });

  it('explains a dashboard failure and recovers when the user retries', async () => {
    const user = userEvent.setup();
    server.replySession('RefreshSession');
    server.reply('AdminDashboard', { errorCode: 'INTERNAL_SERVER_ERROR' });
    replyDashboard(42);
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The dashboard could not be loaded. Something went wrong on our side. Try again shortly.',
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('redirects an unknown address to the dashboard', async () => {
    server.replySession('RefreshSession');
    replyDashboard(7);
    renderApp('/no-such-page');
    expect(await screen.findByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
  });

  it('sends a signed-out visitor of any page to the login form', async () => {
    server.reply('RefreshSession', { errorCode: 'UNAUTHENTICATED' });
    renderApp('/no-such-page');
    expect(await screen.findByRole('heading', { name: 'Sign in', level: 1 })).toBeInTheDocument();
  });
});
