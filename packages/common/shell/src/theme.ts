import { createTheme, type Theme } from '@mui/material/styles';
import { colors, radius, sizes, spacing, typography } from '@common/design-tokens';

/** MUI theme built entirely from the design tokens, so portals never hardcode a style value. */
export function createAppTheme(): Theme {
  return createTheme({
    palette: {
      mode: 'light',
      primary: { main: colors.primary, dark: colors.primaryDark, contrastText: colors.onPrimary },
      secondary: { main: colors.secondary, contrastText: colors.onSecondary },
      error: { main: colors.error, contrastText: colors.onError },
      success: { main: colors.success },
      warning: { main: colors.warning },
      background: { default: colors.background, paper: colors.surface },
      text: { primary: colors.textPrimary, secondary: colors.textSecondary },
      divider: colors.divider,
    },
    spacing: spacing.sm,
    shape: { borderRadius: radius.md },
    typography: {
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize.sm,
      fontWeightRegular: typography.fontWeight.regular,
      fontWeightMedium: typography.fontWeight.medium,
      fontWeightBold: typography.fontWeight.bold,
      button: { textTransform: 'none', fontWeight: typography.fontWeight.medium },
    },
    components: {
      MuiButton: { styleOverrides: { root: { minHeight: sizes.touchTarget } } },
      MuiIconButton: {
        styleOverrides: { root: { minWidth: sizes.touchTarget, minHeight: sizes.touchTarget } },
      },
      MuiOutlinedInput: {
        styleOverrides: { notchedOutline: { borderColor: colors.borderStrong } },
      },
    },
  });
}
