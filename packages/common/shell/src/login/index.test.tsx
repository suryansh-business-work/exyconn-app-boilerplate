import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FakeServer } from '@common/auth/testing';
import { installFakeServer, renderInShell } from '../test/render';
import { LoginPage } from './index';

function renderLogin(state?: unknown) {
  return renderInShell(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>Home page</p>} />
      <Route path="/users" element={<p>Users page</p>} />
    </Routes>,
    { entries: [{ pathname: '/login', state }] },
  );
}

function signedOutServer(): FakeServer {
  const server = installFakeServer();
  server.reply('RefreshSession', { errorCode: 'UNAUTHENTICATED' });
  return server;
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(/Email address/), email);
  await user.type(screen.getByLabelText(/^Password/), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('LoginPage', () => {
  it('shows the sign-in form inside the main landmark with a page heading', async () => {
    signedOutServer();
    renderLogin();
    expect(await screen.findByRole('heading', { name: 'Sign in', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('form', { name: 'Sign in' }),
    );
  });

  it('signs in with normalized credentials and goes to the home page', async () => {
    const server = signedOutServer();
    server.replySession('Login');
    renderLogin();

    await fillAndSubmit('  Asha@Example.com ', 'Str0ngPass');

    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(server.callsTo('Login')[0]?.variables).toEqual({
      input: { email: 'asha@example.com', password: 'Str0ngPass' },
    });
  });

  it('returns the user to the page they originally asked for', async () => {
    const server = signedOutServer();
    server.replySession('Login');
    renderLogin({ from: '/users' });
    await fillAndSubmit('asha@example.com', 'Str0ngPass');
    expect(await screen.findByText('Users page')).toBeInTheDocument();
  });

  it('ignores a redirect target on another site', async () => {
    const server = signedOutServer();
    server.replySession('Login');
    renderLogin({ from: '//evil.example' });
    await fillAndSubmit('asha@example.com', 'Str0ngPass');
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  it.each([
    ['INVALID_CREDENTIALS', 'The email or password is incorrect.'],
    ['RATE_LIMITED', 'Too many attempts. Wait a few minutes and try again.'],
    ['SOMETHING_UNEXPECTED', 'Something went wrong on our side. Try again shortly.'],
  ])('explains a %s failure and keeps the user on the form', async (errorCode, message) => {
    const server = signedOutServer();
    server.reply('Login', { errorCode });
    renderLogin();

    await fillAndSubmit('asha@example.com', 'Wr0ngPass');

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(screen.queryByText('Home page')).not.toBeInTheDocument();
  });

  it('explains a connection failure', async () => {
    const server = signedOutServer();
    server.reply('Login', { networkError: new TypeError('Failed to fetch') });
    renderLogin();
    await fillAndSubmit('asha@example.com', 'Str0ngPass');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server. Check your connection and try again.',
    );
  });

  it('clears the previous error when the user tries again', async () => {
    const server = signedOutServer();
    server.reply('Login', { errorCode: 'INVALID_CREDENTIALS' });
    server.replySession('Login');
    renderLogin();

    await fillAndSubmit('asha@example.com', 'Wr0ngPass');
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  it('does not call the server when the form is invalid', async () => {
    const server = signedOutServer();
    renderLogin();

    await fillAndSubmit('not-an-email', 'x');

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/)).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(screen.getByLabelText(/Email address/)).toBeInvalid();
    expect(server.callsTo('Login')).toHaveLength(0);
  });

  it('skips the form for a user who is already signed in', async () => {
    const server = installFakeServer();
    server.replySession('RefreshSession');
    renderLogin();
    expect(await screen.findByText('Home page')).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('shows a progress message, not the form, while the session is being checked', async () => {
    signedOutServer();
    renderLogin();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session…');
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('form')).toBeInTheDocument());
  });
});
