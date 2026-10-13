import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { sizes } from '@common/design-tokens';
import { PageErrorBoundary } from '@common/error-boundary/web';
import { useTranslate } from '@common/localization/react';
import { MAIN_CONTENT_ID } from '../routes';
import { Header } from './header';
import type { NavItem } from './layout.types';
import { Sidebar } from './sidebar';

export interface AppShellProps {
  navItems: readonly NavItem[];
}

/**
 * Portal frame: header, sidebar and the routed page. Each page renders inside
 * its own error boundary, which resets when the route changes.
 */
export function AppShell({ navItems }: Readonly<AppShellProps>) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const translate = useTranslate();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Link
        href={`#${MAIN_CONTENT_ID}`}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          p: 1,
          bgcolor: 'background.paper',
          zIndex: 'tooltip',
          transform: 'translateY(-100%)',
          '&:focus': { transform: 'none' },
        }}
      >
        {translate('shell.skipToContent')}
      </Link>
      <Header
        onOpenNavigation={() => {
          setMobileOpen(true);
        }}
      />
      <Sidebar
        navItems={navItems}
        mobileOpen={mobileOpen}
        onClose={() => {
          setMobileOpen(false);
        }}
      />
      <Box
        component="main"
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: 3,
          mt: `${sizes.headerHeight}px`,
          maxWidth: sizes.contentMaxWidth,
        }}
      >
        <PageErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </PageErrorBoundary>
      </Box>
    </Box>
  );
}
