import BugReportOutlined from '@mui/icons-material/BugReportOutlined';
import ErrorOutline from '@mui/icons-material/ErrorOutlineOutlined';
import Refresh from '@mui/icons-material/Refresh';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { sizes } from '@common/design-tokens';
import { useTranslate } from '@common/localization/react';
import {
  ErrorBoundary,
  reportStatusMessageKey,
  useReportIssue,
  type ErrorFallbackProps,
} from '../core';

/** Fallback shown in place of a page that failed to render. */
export function PageErrorFallback({ report, retry }: Readonly<ErrorFallbackProps>) {
  const translate = useTranslate();
  const { status, submit } = useReportIssue(report);
  const statusKey = reportStatusMessageKey(status);

  return (
    <Paper
      role="alert"
      variant="outlined"
      sx={{ p: 3, mx: 'auto', my: 4, maxWidth: sizes.formMaxWidth }}
    >
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <ErrorOutline color="error" fontSize="large" aria-hidden />
        <Typography component="h2" variant="h6">
          {translate('errorBoundary.title')}
        </Typography>
        <Typography color="text.secondary">{translate('errorBoundary.body')}</Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<Refresh aria-hidden />} onClick={retry}>
            {translate('errorBoundary.retry')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<BugReportOutlined aria-hidden />}
            onClick={submit}
            disabled={status === 'sending' || status === 'sent'}
          >
            {translate('errorBoundary.report')}
          </Button>
        </Stack>
        <Typography role="status" aria-live="polite" variant="body2" color="text.secondary">
          {statusKey ? translate(statusKey) : ''}
        </Typography>
      </Stack>
    </Paper>
  );
}

export interface PageErrorBoundaryProps {
  /** Clears a shown error when it changes; pass the current route path. */
  resetKey?: string;
  children: ReactNode;
}

function renderFallback(props: ErrorFallbackProps): ReactNode {
  return <PageErrorFallback {...props} />;
}

/** Wrap every page in this so one page failing never crashes the whole portal. */
export function PageErrorBoundary({ resetKey, children }: Readonly<PageErrorBoundaryProps>) {
  return (
    <ErrorBoundary fallback={renderFallback} {...(resetKey === undefined ? {} : { resetKey })}>
      {children}
    </ErrorBoundary>
  );
}
