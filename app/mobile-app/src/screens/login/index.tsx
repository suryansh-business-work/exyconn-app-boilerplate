import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, YStack } from 'tamagui';
import { useLoginSubmit } from '@common/auth/react';
import { colors, sizes, spacing, typography } from '@common/design-tokens';
import { ScreenErrorBoundary } from '@common/error-boundary/native';
import { useTranslate } from '@common/localization/react';
import { LoginForm } from './login.form';

const fill = { flex: 1 } as const;

function LoginContent() {
  const translate = useTranslate();
  const { errorKey, submit } = useLoginSubmit();

  return (
    <SafeAreaView style={{ ...fill, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <YStack
          flex={1}
          justifyContent="center"
          alignSelf="center"
          width="100%"
          maxWidth={sizes.formMaxWidth}
          padding={spacing.lg}
          gap={spacing.lg}
        >
          <YStack gap={spacing.xs}>
            <Text fontSize={typography.fontSize.sm} color={colors.textSecondary}>
              {translate('app.name')}
            </Text>
            <Text
              role="heading"
              fontSize={typography.fontSize.xxl}
              fontWeight={typography.fontWeight.bold}
              color={colors.textPrimary}
            >
              {translate('auth.login.title')}
            </Text>
            <Text fontSize={typography.fontSize.md} color={colors.textSecondary}>
              {translate('auth.login.subtitle')}
            </Text>
          </YStack>
          <LoginForm onSubmit={submit} errorMessage={errorKey ? translate(errorKey) : null} />
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function LoginScreen() {
  return (
    <ScreenErrorBoundary>
      <LoginContent />
    </ScreenErrorBoundary>
  );
}
