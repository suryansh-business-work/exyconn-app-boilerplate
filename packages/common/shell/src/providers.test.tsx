import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { createFakeServer, type FakeServer } from '@common/auth/testing';
import { colors, radius, spacing } from '@common/design-tokens';
import { useTranslate } from '@common/localization/react';
import { PortalProviders } from './providers';
import { API_URL } from './test/render';
import { createAppTheme } from './theme';

let server: FakeServer;
let consoleError: MockInstance<typeof console.error>;

function Label() {
  const translate = useTranslate();
  return <p>{translate('auth.login.submit')}</p>;
}

function Broken(): never {
  throw new Error('Widget failed for asha@example.com');
}

function renderWithProviders(children: ReactNode, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PortalProviders apiUrl={API_URL} locale="en-IN">
        {children}
      </PortalProviders>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  server = createFakeServer();
  server.reply('RefreshSession', { errorCode: 'UNAUTHENTICATED' });
  vi.stubGlobal('fetch', server.fetchFn);
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PortalProviders', () => {
  it('requests translations for the locale and prefers them over the bundled text', async () => {
    server.reply('Translations', {
      data: { translations: [{ key: 'auth.login.submit', value: 'Log in to the portal' }] },
    });
    renderWithProviders(<Label />);

    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(await screen.findByText('Log in to the portal')).toBeInTheDocument();
    expect(server.callsTo('Translations')[0]?.variables).toEqual({ locale: 'en-IN' });
  });

  it('keeps the bundled text and logs a redacted error when translations cannot be loaded', async () => {
    server.reply('Translations', { networkError: new TypeError('Failed to fetch') });
    renderWithProviders(<Label />);

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        '[portal]',
        expect.objectContaining({ name: 'AppError', message: 'NETWORK_ERROR' }),
      ),
    );
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('catches a crash anywhere in the app and reports it with the current path', async () => {
    const user = userEvent.setup();
    server.reply('Translations', { data: { translations: [] } });
    server.reply('ReportClientError', { data: { reportClientError: true } });
    window.history.replaceState(null, '', '/users/42');
    renderWithProviders(<Broken />);

    await user.click(await screen.findByRole('button', { name: 'Report an issue' }));
    expect(await screen.findByText('Thanks. The issue has been reported.')).toBeInTheDocument();

    const input = server.callsTo('ReportClientError')[0]?.variables.input;
    expect(input).toMatchObject({
      name: 'Error',
      message: 'Widget failed for [redacted]',
      location: '/users/42',
    });
    expect(JSON.stringify(input)).not.toContain('asha@example.com');
  });
});

describe('createAppTheme', () => {
  it('takes its palette, spacing and shape from the design tokens', () => {
    const theme = createAppTheme();
    expect(theme.palette.primary.main).toBe(colors.primary);
    expect(theme.palette.background.default).toBe(colors.background);
    expect(theme.palette.text.secondary).toBe(colors.textSecondary);
    expect(theme.spacing(2)).toBe(`${spacing.sm * 2}px`);
    expect(theme.shape.borderRadius).toBe(radius.md);
  });
});
