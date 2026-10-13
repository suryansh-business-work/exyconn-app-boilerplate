export { contrastRatio } from './contrast';

export const colors = {
  primary: '#1D4ED8',
  primaryDark: '#1E3A8A',
  onPrimary: '#FFFFFF',
  secondary: '#0F766E',
  onSecondary: '#FFFFFF',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  // Meets the 3:1 non-text contrast needed for input and control outlines.
  borderStrong: '#64748B',
  divider: '#E2E8F0',
  error: '#B91C1C',
  onError: '#FFFFFF',
  success: '#15803D',
  warning: '#B45309',
} as const;

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
  },
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(15, 23, 42, 0.08)',
  md: '0 4px 12px rgba(15, 23, 42, 0.12)',
} as const;

export const borderWidth = {
  none: 0,
  thin: 1,
  thick: 2,
} as const;

export const opacity = {
  disabled: 0.6,
} as const;

export const sizes = {
  // Smallest comfortable touch target (WCAG 2.2 target size).
  touchTarget: 44,
  headerHeight: 64,
  sidebarWidth: 240,
  formMaxWidth: 420,
  contentMaxWidth: 1200,
} as const;

export const tokens = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  borderWidth,
  opacity,
  sizes,
} as const;

export type DesignTokens = typeof tokens;
