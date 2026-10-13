import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorReportingProvider, type ErrorReport } from '../index';
import { PageErrorBoundary } from './index';

let shouldThrow = true;

function Page() {
  if (shouldThrow) {
    throw new TypeError('Cannot load profile of asha@example.com');
  }
  return <p>Page content</p>;
}

function renderPage(
  options: { send?: (report: ErrorReport) => Promise<void>; resetKey?: string } = {},
) {
  const log = vi.fn<(report: ErrorReport) => void>();
  const send = vi.fn(options.send ?? (() => Promise.resolve()));
  const view = render(
    <ErrorReportingProvider send={send} log={log}>
      <p>Portal header</p>
      <PageErrorBoundary {...(options.resetKey ? { resetKey: options.resetKey } : {})}>
        <Page />
      </PageErrorBoundary>
    </ErrorReportingProvider>,
  );
  return { log, send, ...view };
}

beforeEach(() => {
  shouldThrow = true;
  // React prints every caught render error; keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PageErrorBoundary', () => {
  it('renders the page when nothing fails', () => {
    shouldThrow = false;
    renderPage();
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('replaces only the failed page and leaves the rest of the app standing', () => {
    renderPage();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'This page ran into a problem' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Portal header')).toBeInTheDocument();
    expect(screen.queryByText('Page content')).not.toBeInTheDocument();
  });

  it('never shows the raw error text to the user', () => {
    renderPage();
    expect(screen.queryByText(/Cannot load profile/)).not.toBeInTheDocument();
  });

  it('logs a redacted report with the component stack', () => {
    const { log } = renderPage();
    expect(log).toHaveBeenCalledTimes(1);
    const report = log.mock.calls[0]?.[0];
    expect(report).toMatchObject({
      name: 'TypeError',
      message: 'Cannot load profile of [redacted]',
    });
    expect(report?.componentStack).toContain('Page');
    expect(JSON.stringify(report)).not.toContain('asha@example.com');
  });

  it('retries: shows the error again if it still fails, the page once it works', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sends the redacted report once and confirms it', async () => {
    const user = userEvent.setup();
    const { send } = renderPage();
    const reportButton = screen.getByRole('button', { name: 'Report an issue' });

    await user.click(reportButton);

    expect(await screen.findByText('Thanks. The issue has been reported.')).toBeInTheDocument();
    expect(send).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: 'TypeError', message: 'Cannot load profile of [redacted]' }),
    );
    expect(reportButton).toBeDisabled();
  });

  it('disables the button while sending so a double click cannot send twice', async () => {
    const user = userEvent.setup();
    let finish: () => void = () => undefined;
    const { send } = renderPage({
      send: () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    });
    const reportButton = screen.getByRole('button', { name: 'Report an issue' });

    await user.click(reportButton);
    expect(screen.getByText('Sending report…')).toBeInTheDocument();
    expect(reportButton).toBeDisabled();
    // A raw click event, as a script or an impatient double click would produce.
    fireEvent.click(reportButton);
    expect(send).toHaveBeenCalledTimes(1);

    finish();
    expect(await screen.findByText('Thanks. The issue has been reported.')).toBeInTheDocument();
  });

  it('tells the user when the report could not be sent and lets them try again', async () => {
    const user = userEvent.setup();
    const send = vi
      .fn<(report: ErrorReport) => Promise<void>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce();
    const { log } = renderPage({ send });
    const reportButton = screen.getByRole('button', { name: 'Report an issue' });

    await user.click(reportButton);
    expect(await screen.findByText('The report could not be sent. Try again.')).toBeInTheDocument();
    expect(log).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'ReportSendFailed' }));
    expect(reportButton).toBeEnabled();

    await user.click(reportButton);
    expect(await screen.findByText('Thanks. The issue has been reported.')).toBeInTheDocument();
  });

  it('announces status changes to screen readers', () => {
    renderPage();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('can be operated with the keyboard alone', async () => {
    const user = userEvent.setup();
    const { send } = renderPage();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Report an issue' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  });

  it('clears the error when the route changes', async () => {
    const user = userEvent.setup();
    function Routes() {
      const [path, setPath] = useState('/broken');
      return (
        <>
          <button
            type="button"
            onClick={() => {
              shouldThrow = false;
              setPath('/working');
            }}
          >
            Navigate
          </button>
          <PageErrorBoundary resetKey={path}>
            <Page />
          </PageErrorBoundary>
        </>
      );
    }
    render(<Routes />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Navigate' }));
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('logs to the console and fails the report cleanly when no provider is configured', async () => {
    const user = userEvent.setup();
    render(
      <PageErrorBoundary>
        <Page />
      </PageErrorBoundary>,
    );
    expect(console.error).toHaveBeenCalledWith(
      '[error-boundary]',
      expect.objectContaining({ name: 'TypeError' }),
    );
    await user.click(screen.getByRole('button', { name: 'Report an issue' }));
    expect(await screen.findByText('The report could not be sent. Try again.')).toBeInTheDocument();
  });
});
