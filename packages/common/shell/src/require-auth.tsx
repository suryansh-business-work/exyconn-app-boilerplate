import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@common/auth/react';
import { sizes } from '@common/design-tokens';
import { useTranslate } from '@common/localization/react';
import type { Role } from '@common/types';
import { FullPageStatus } from './full-page-status';
import { MAIN_CONTENT_ID, SHELL_ROUTES } from './routes';

export interface RequireAuthProps {
  /** Role the signed-in user must hold. The server enforces the same rule on every request. */
  requiredRole?: Role;
  children: ReactNode;
}

/** Shows its children only to a signed-in user who holds the required role. */
export function RequireAuth({ requiredRole, children }: Readonly<RequireAuthProps>) {
  const { status, user, logout } = useAuth();
  const location = useLocation();
  const translate = useTranslate();

  if (status === 'loading') {
    return <FullPageStatus label={translate('auth.session.checking')} />;
  }
  if (!user) {
    return <Navigate to={SHELL_ROUTES.login} replace state={{ from: location.pathname }} />;
  }
  if (requiredRole && !user.roles.includes(requiredRole)) {
    return (
      <Box
        component="main"
        id={MAIN_CONTENT_ID}
        sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', p: 2 }}
      >
        <Paper variant="outlined" sx={{ p: 3, mx: 'auto', maxWidth: sizes.formMaxWidth }}>
          <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography component="h1" variant="h5">
              {translate('auth.forbidden.title')}
            </Typography>
            <Typography color="text.secondary">{translate('auth.forbidden.body')}</Typography>
            <Button
              variant="contained"
              startIcon={<LogoutOutlined aria-hidden />}
              onClick={() => void logout()}
            >
              {translate('auth.logout')}
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }
  return children;
}
