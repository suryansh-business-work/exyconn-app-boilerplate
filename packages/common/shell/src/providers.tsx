import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { fetchTranslations, sendClientErrorReport } from '@common/api';
import { createSessionManager } from '@common/auth';
import { AuthProvider } from '@common/auth/react';
import { ErrorReportingProvider, type ErrorReport } from '@common/error-boundary';
import { PageErrorBoundary } from '@common/error-boundary/web';
import { ERROR_CODES, getErrorCode, sanitizeError } from '@common/error-handling';
import { LocalizationProvider } from '@common/localization/react';
import { createAppTheme } from './theme';

const MAX_NETWORK_RETRIES = 2;

/** Developer diagnostics for failures the user is not shown. Redacted before it reaches the console. */
function logError(error: unknown): void {
  console.error('[portal]', sanitizeError(error));
}

function createServices(apiUrl: string) {
  return {
    theme: createAppTheme(),
    session: createSessionManager({ url: apiUrl, platform: 'web', onError: logError }),
    queryClient: new QueryClient({
      defaultOptions: {
        queries: {
          // Only a dropped connection is worth repeating; other errors would fail the same way.
          retry: (failureCount, error) =>
            getErrorCode(error) === ERROR_CODES.NETWORK_ERROR && failureCount < MAX_NETWORK_RETRIES,
        },
      },
    }),
  };
}

export interface PortalProvidersProps {
  /** Full URL of the GraphQL endpoint. */
  apiUrl: string;
  locale: string;
  children: ReactNode;
}

/** Everything a portal needs around its routes: theme, data, translations, error reporting, auth. */
export function PortalProviders({ apiUrl, locale, children }: Readonly<PortalProvidersProps>) {
  const [{ theme, session, queryClient }] = useState(() => createServices(apiUrl));

  useEffect(() => () => session.dispose(), [session]);

  const loadMessages = useCallback(
    (requestedLocale: string) => fetchTranslations(session.client, requestedLocale),
    [session],
  );

  const sendReport = useCallback(
    (report: ErrorReport) =>
      sendClientErrorReport(session.client, {
        ...report,
        location: globalThis.location.pathname,
      }),
    [session],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <LocalizationProvider locale={locale} loadMessages={loadMessages} onError={logError}>
          <ErrorReportingProvider send={sendReport}>
            <AuthProvider session={session}>
              <PageErrorBoundary>{children}</PageErrorBoundary>
            </AuthProvider>
          </ErrorReportingProvider>
        </LocalizationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
