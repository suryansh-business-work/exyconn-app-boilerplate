import Constants from 'expo-constants';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { fetchTranslations, sendClientErrorReport } from '@common/api';
import { createSessionManager } from '@common/auth';
import { AuthProvider } from '@common/auth/react';
import { ErrorReportingProvider, type ErrorReport } from '@common/error-boundary';
import { sanitizeError } from '@common/error-handling';
import { resolveLocale } from '@common/localization';
import { LocalizationProvider } from '@common/localization/react';
import type { AppConfig } from './config';
import { secureTokenStore } from './secure-token-store';

/** Developer diagnostics for failures the user is not shown. Redacted before it reaches the console. */
function logError(error: unknown): void {
  console.error('[app]', sanitizeError(error));
}

function deviceLocale(): string {
  return resolveLocale(Intl.DateTimeFormat().resolvedOptions().locale);
}

export interface AppProvidersProps {
  config: AppConfig;
  children: ReactNode;
}

/** Everything the screens need around them: translations, error reporting, auth. */
export function AppProviders({ config, children }: Readonly<AppProvidersProps>) {
  const [session] = useState(() =>
    createSessionManager({
      url: config.apiUrl,
      platform: 'native',
      tokenStore: secureTokenStore,
      onError: logError,
    }),
  );
  const [locale] = useState(deviceLocale);

  useEffect(() => () => session.dispose(), [session]);

  const loadMessages = useCallback(
    (requestedLocale: string) => fetchTranslations(session.client, requestedLocale),
    [session],
  );

  const sendReport = useCallback(
    (report: ErrorReport) =>
      sendClientErrorReport(session.client, {
        ...report,
        ...(Constants.expoConfig?.version ? { appVersion: Constants.expoConfig.version } : {}),
      }),
    [session],
  );

  return (
    <LocalizationProvider locale={locale} loadMessages={loadMessages} onError={logError}>
      <ErrorReportingProvider send={sendReport}>
        <AuthProvider session={session}>{children}</AuthProvider>
      </ErrorReportingProvider>
    </LocalizationProvider>
  );
}
