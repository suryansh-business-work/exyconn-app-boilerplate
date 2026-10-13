import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export interface FullPageStatusProps {
  label: string;
}

/** Centered progress indicator for whole-page waits, announced to screen readers. */
export function FullPageStatus({ label }: Readonly<FullPageStatusProps>) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress aria-hidden />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}
