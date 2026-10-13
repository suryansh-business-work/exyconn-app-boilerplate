import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, YStack } from 'tamagui';
import { useAuth } from '@common/auth/react';
import { borderWidth, colors, radius, sizes, spacing, typography } from '@common/design-tokens';
import { ScreenErrorBoundary } from '@common/error-boundary/native';
import { useTranslate } from '@common/localization/react';

function HomeContent() {
  const { user, logout } = useAuth();
  const translate = useTranslate();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <YStack flex={1} padding={spacing.lg} gap={spacing.md}>
        <Text
          role="heading"
          fontSize={typography.fontSize.xxl}
          fontWeight={typography.fontWeight.bold}
          color={colors.textPrimary}
        >
          {translate('home.title')}
        </Text>
        {user ? (
          <YStack gap={spacing.xs}>
            <Text fontSize={typography.fontSize.lg} color={colors.textPrimary}>
              {translate('home.welcome', { name: user.name })}
            </Text>
            <Text fontSize={typography.fontSize.sm} color={colors.textSecondary}>
              {translate('home.signedInAs', { email: user.email })}
            </Text>
          </YStack>
        ) : null}
        <Button
          alignSelf="flex-start"
          minHeight={sizes.touchTarget}
          borderRadius={radius.md}
          borderWidth={borderWidth.thin}
          borderColor={colors.borderStrong}
          backgroundColor={colors.surface}
          onPress={() => void logout()}
        >
          <Text color={colors.textPrimary} fontWeight={typography.fontWeight.medium}>
            {translate('auth.logout')}
          </Text>
        </Button>
      </YStack>
    </SafeAreaView>
  );
}

export function HomeScreen() {
  return (
    <ScreenErrorBoundary>
      <HomeContent />
    </ScreenErrorBoundary>
  );
}
