import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Navigate, useLocation } from 'react-router';
import { useAuth, useLoginSubmit } from '@common/auth/react';
import { sizes } from '@common/design-tokens';
import { PageErrorBoundary } from '@common/error-boundary/web';
import { useTranslate } from '@common/localization/react';
import { FullPageStatus } from '../full-page-status';
import { MAIN_CONTENT_ID, resolveRedirect } from '../routes';
import { LoginForm } from './login.form';

function LoginContent() {
  const { status } = useAuth();
  const location = useLocation();
  const translate = useTranslate();
  const { errorKey, submit } = useLoginSubmit();

  if (status === 'loading') {
    return <FullPageStatus label={translate('auth.session.checking')} />;
  }
  if (status === 'authenticated') {
    return <Navigate to={resolveRedirect(location.state)} replace />;
  }

  return (
    <Box
      component="main"
      id={MAIN_CONTENT_ID}
      sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', p: 2 }}
    >
      <Paper
        variant="outlined"
        sx={{ p: 4, mx: 'auto', width: '100%', maxWidth: sizes.formMaxWidth }}
      >
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="overline" color="text.secondary">
              {translate('app.name')}
            </Typography>
            <Typography component="h1" variant="h4">
              {translate('auth.login.title')}
            </Typography>
            <Typography color="text.secondary">{translate('auth.login.subtitle')}</Typography>
          </Stack>
          <LoginForm onSubmit={submit} errorMessage={errorKey ? translate(errorKey) : null} />
        </Stack>
      </Paper>
    </Box>
  );
}

/** Sign-in page shared by every portal. */
export function LoginPage() {
  return (
    <PageErrorBoundary>
      <LoginContent />
    </PageErrorBoundary>
  );
}
