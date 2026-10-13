import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocalizationProvider, useTranslate } from './react';

function Label({ messageKey }: Readonly<{ messageKey: string }>) {
  const translate = useTranslate();
  return <p>{translate(messageKey)}</p>;
}

describe('LocalizationProvider', () => {
  it('shows fallback text first, then the server text once loaded', async () => {
    const loadMessages = vi.fn().mockResolvedValue({ 'auth.login.submit': 'Log in now' });
    render(
      <LocalizationProvider locale="en" loadMessages={loadMessages} onError={vi.fn()}>
        <Label messageKey="auth.login.submit" />
      </LocalizationProvider>,
    );

    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(await screen.findByText('Log in now')).toBeInTheDocument();
    expect(loadMessages).toHaveBeenCalledExactlyOnceWith('en');
  });

  it('keeps the fallback and reports the error when loading fails', async () => {
    const failure = new Error('offline');
    const onError = vi.fn();
    render(
      <LocalizationProvider
        locale="en"
        loadMessages={vi.fn().mockRejectedValue(failure)}
        onError={onError}
      >
        <Label messageKey="auth.login.submit" />
      </LocalizationProvider>,
    );

    await waitFor(() => expect(onError).toHaveBeenCalledExactlyOnceWith(failure));
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('reloads when the locale changes', async () => {
    const loadMessages = vi.fn((locale: string) =>
      Promise.resolve({ 'auth.login.submit': `submit-${locale}` }),
    );
    const onError = vi.fn();
    const { rerender } = render(
      <LocalizationProvider locale="en" loadMessages={loadMessages} onError={onError}>
        <Label messageKey="auth.login.submit" />
      </LocalizationProvider>,
    );
    expect(await screen.findByText('submit-en')).toBeInTheDocument();

    rerender(
      <LocalizationProvider locale="hi" loadMessages={loadMessages} onError={onError}>
        <Label messageKey="auth.login.submit" />
      </LocalizationProvider>,
    );
    expect(await screen.findByText('submit-hi')).toBeInTheDocument();
  });

  it('ignores a response that arrives after unmount', async () => {
    let resolveMessages: ((messages: Record<string, string>) => void) | undefined;
    const loadMessages = vi.fn(
      () =>
        new Promise<Record<string, string>>((resolve) => {
          resolveMessages = resolve;
        }),
    );
    const onError = vi.fn();
    const { unmount } = render(
      <LocalizationProvider locale="en" loadMessages={loadMessages} onError={onError}>
        <Label messageKey="auth.login.submit" />
      </LocalizationProvider>,
    );
    unmount();
    resolveMessages?.({ 'auth.login.submit': 'late' });
    await Promise.resolve();
    expect(onError).not.toHaveBeenCalled();
    expect(screen.queryByText('late')).not.toBeInTheDocument();
  });
});

describe('useTranslate without a provider', () => {
  it('serves the bundled fallback', () => {
    render(<Label messageKey="auth.logout" />);
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });
});
