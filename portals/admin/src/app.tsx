import { Navigate, Route, Routes } from 'react-router';
import { resolveLocale } from '@common/localization';
import { AppShell, LoginPage, PortalProviders, RequireAuth, SHELL_ROUTES } from '@common/shell';
import { ROLES } from '@common/types';
import type { PortalConfig } from './config';
import { navItems } from './navigation';
import { DashboardPage } from './pages/dashboard';

export interface AppProps {
  config: PortalConfig;
}

export function App({ config }: Readonly<AppProps>) {
  return (
    <PortalProviders apiUrl={config.apiUrl} locale={resolveLocale(navigator.language)}>
      <Routes>
        <Route path={SHELL_ROUTES.login} element={<LoginPage />} />
        <Route
          element={
            <RequireAuth requiredRole={ROLES.admin}>
              <AppShell navItems={navItems} />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to={SHELL_ROUTES.home} replace />} />
      </Routes>
    </PortalProviders>
  );
}
