import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';
import {
  borderWidth,
  colors,
  opacity,
  radius,
  sizes,
  spacing,
  typography,
} from '@common/design-tokens';
import { useTranslate } from '@common/localization/react';
import {
  ErrorBoundary,
  reportStatusMessageKey,
  useReportIssue,
  type ErrorFallbackProps,
} from '../core';

/** Fallback shown in place of a screen that failed to render. */
export function ScreenErrorFallback({ report, retry }: Readonly<ErrorFallbackProps>) {
  const translate = useTranslate();
  const { status, submit } = useReportIssue(report);
  const statusKey = reportStatusMessageKey(status);
  const reportDisabled = status === 'sending' || status === 'sent';

  return (
    <YStack
      flex={1}
      justifyContent="center"
      padding={spacing.lg}
      gap={spacing.md}
      backgroundColor={colors.background}
      role="alert"
    >
      <MaterialIcons name="error-outline" size={sizes.touchTarget} color={colors.error} />
      <Text
        role="heading"
        fontSize={typography.fontSize.lg}
        fontWeight={typography.fontWeight.bold}
        color={colors.textPrimary}
      >
        {translate('errorBoundary.title')}
      </Text>
      <Text fontSize={typography.fontSize.md} color={colors.textSecondary}>
        {translate('errorBoundary.body')}
      </Text>
      <XStack gap={spacing.sm} flexWrap="wrap">
        <Button
          minHeight={sizes.touchTarget}
          borderRadius={radius.md}
          backgroundColor={colors.primary}
          onPress={retry}
        >
          <Text color={colors.onPrimary} fontWeight={typography.fontWeight.medium}>
            {translate('errorBoundary.retry')}
          </Text>
        </Button>
        <Button
          minHeight={sizes.touchTarget}
          borderRadius={radius.md}
          borderWidth={borderWidth.thin}
          borderColor={colors.borderStrong}
          backgroundColor={colors.surface}
          disabled={reportDisabled}
          opacity={reportDisabled ? opacity.disabled : undefined}
          onPress={submit}
        >
          <Text color={colors.textPrimary} fontWeight={typography.fontWeight.medium}>
            {translate('errorBoundary.report')}
          </Text>
        </Button>
      </XStack>
      <Text
        aria-live="polite"
        fontSize={typography.fontSize.sm}
        color={colors.textSecondary}
        minHeight={typography.fontSize.sm * typography.lineHeight.normal}
      >
        {statusKey ? translate(statusKey) : ''}
      </Text>
    </YStack>
  );
}

export interface ScreenErrorBoundaryProps {
  /** Clears a shown error when it changes; pass the current screen name. */
  resetKey?: string;
  children: ReactNode;
}

function renderFallback(props: ErrorFallbackProps): ReactNode {
  return <ScreenErrorFallback {...props} />;
}

/** Wrap every screen in this so one screen failing never crashes the whole app. */
export function ScreenErrorBoundary({ resetKey, children }: Readonly<ScreenErrorBoundaryProps>) {
  return (
    <ErrorBoundary fallback={renderFallback} {...(resetKey === undefined ? {} : { resetKey })}>
      {children}
    </ErrorBoundary>
  );
}
