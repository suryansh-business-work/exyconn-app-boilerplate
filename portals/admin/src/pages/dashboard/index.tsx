import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { AdminDashboardDocument } from '@common/api';
import { useApiClient, useAuth } from '@common/auth/react';
import { sizes } from '@common/design-tokens';
import { toMessageKey } from '@common/error-handling';
import { useTranslate } from '@common/localization/react';

export const ADMIN_DASHBOARD_QUERY_KEY = ['adminDashboard'] as const;

/** Rendered inside the shell, which wraps every routed page in an error boundary. */
export function DashboardPage() {
  const { user } = useAuth();
  const client = useApiClient();
  const translate = useTranslate();
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ADMIN_DASHBOARD_QUERY_KEY,
    queryFn: () => client.execute(AdminDashboardDocument),
  });

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography component="h1" variant="h4">
          {translate('dashboard.title')}
        </Typography>
        {user ? (
          <Typography color="text.secondary">
            {translate('dashboard.welcome', { name: user.name })}
          </Typography>
        ) : null}
      </Stack>

      {isPending ? (
        <Stack direction="row" spacing={2} role="status" sx={{ alignItems: 'center' }}>
          <CircularProgress size={sizes.touchTarget / 2} aria-hidden />
          <Typography color="text.secondary">{translate('common.loading')}</Typography>
        </Stack>
      ) : null}

      {error ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" disabled={isFetching} onClick={() => void refetch()}>
              {translate('common.retry')}
            </Button>
          }
        >
          {translate('dashboard.loadFailed')} {translate(toMessageKey(error))}
        </Alert>
      ) : null}

      {data ? (
        <Card variant="outlined" sx={{ maxWidth: sizes.formMaxWidth }}>
          <CardContent>
            <Typography color="text.secondary">{translate('dashboard.totalUsers')}</Typography>
            <Typography component="p" variant="h3">
              {data.adminDashboard.totalUsers}
            </Typography>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
