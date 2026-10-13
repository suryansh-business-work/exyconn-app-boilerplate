import { describe, expect, it } from 'vitest';
import { colors, contrastRatio } from './index';

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

describe('contrastRatio', () => {
  it('returns 21 for black on white and 1 for identical colors', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#1D4ED8', '#1D4ED8')).toBe(1);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#1D4ED8', '#FFFFFF')).toBe(contrastRatio('#FFFFFF', '#1D4ED8'));
  });

  it.each(['1D4ED8', '#FFF', '#GGGGGG', ''])('rejects the malformed color "%s"', (value) => {
    expect(() => contrastRatio(value, '#FFFFFF')).toThrow('Expected a #RRGGBB color');
  });
});

describe('color tokens meet WCAG 2.2 AA', () => {
  it.each([
    ['textPrimary on background', colors.textPrimary, colors.background],
    ['textPrimary on surface', colors.textPrimary, colors.surface],
    ['textSecondary on background', colors.textSecondary, colors.background],
    ['textSecondary on surface', colors.textSecondary, colors.surface],
    ['primary on surface', colors.primary, colors.surface],
    ['primary on background', colors.primary, colors.background],
    ['onPrimary on primary', colors.onPrimary, colors.primary],
    ['onPrimary on primaryDark', colors.onPrimary, colors.primaryDark],
    ['onSecondary on secondary', colors.onSecondary, colors.secondary],
    ['error on surface', colors.error, colors.surface],
    ['onError on error', colors.onError, colors.error],
    ['success on surface', colors.success, colors.surface],
    ['warning on surface', colors.warning, colors.surface],
  ])('%s has at least 4.5:1 text contrast', (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each([
    ['borderStrong on surface', colors.borderStrong, colors.surface],
    ['borderStrong on background', colors.borderStrong, colors.background],
  ])('%s has at least 3:1 non-text contrast', (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});
