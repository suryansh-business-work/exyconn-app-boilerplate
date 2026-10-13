import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Spinner, TamaguiProvider, Text, YStack } from 'tamagui';
import { useAuth } from '@common/auth/react';
import { colors, spacing, typography } from '@common/design-tokens';
import { ScreenErrorBoundary } from '@common/error-boundary/native';
import { useTranslate } from '@common/localization/react';
import { loadConfig } from './src/config';
import { AppProviders } from './src/providers';
import { HomeScreen } from './src/screens/home';
import { LoginScreen } from './src/screens/login';
import { tamaguiConfig } from './src/tamagui.config';

function SessionGate() {
  const { status } = useAuth();
  const translate = useTranslate();

  if (status === 'loading') {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        gap={spacing.md}
        backgroundColor={colors.background}
        aria-live="polite"
      >
        <Spinner size="large" color={colors.primary} />
        <Text fontSize={typography.fontSize.md} color={colors.textSecondary}>
          {translate('auth.session.checking')}
        </Text>
      </YStack>
    );
  }
  return status === 'authenticated' ? <HomeScreen /> : <LoginScreen />;
}

function ConfiguredApp() {
  // The API URL is embedded at build time; a missing one is caught by the boundary above.
  const [config] = useState(() => loadConfig(Constants.expoConfig?.extra));
  return (
    <AppProviders config={config}>
      <StatusBar style="dark" />
      <SessionGate />
    </AppProviders>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <ScreenErrorBoundary>
          <ConfiguredApp />
        </ScreenErrorBoundary>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}
