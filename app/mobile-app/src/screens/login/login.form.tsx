import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, Text, YStack } from 'tamagui';
import { colors, opacity, radius, sizes, spacing, typography } from '@common/design-tokens';
import { useTranslate } from '@common/localization/react';
import { loginSchema } from '@common/validators';
import { FormField } from './form-field';
import type { LoginFormProps, LoginValues } from './login.types';

export function LoginForm({ onSubmit, errorMessage }: Readonly<LoginFormProps>) {
  const translate = useTranslate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const emailError = errors.email?.message;
  const passwordError = errors.password?.message;

  return (
    <YStack gap={spacing.md}>
      {errorMessage ? (
        <Text
          role="alert"
          padding={spacing.sm}
          borderRadius={radius.md}
          backgroundColor={colors.surface}
          color={colors.error}
          fontSize={typography.fontSize.sm}
        >
          {errorMessage}
        </Text>
      ) : null}
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <FormField
            label={translate('auth.login.email')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={emailError ? translate(emailError) : undefined}
            type="email"
            autoComplete="email"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <FormField
            label={translate('auth.login.password')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={passwordError ? translate(passwordError) : undefined}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            trailing={
              <Button
                width={sizes.touchTarget}
                height={sizes.touchTarget}
                padding={spacing.none}
                backgroundColor={colors.surface}
                aria-label={translate(
                  showPassword ? 'auth.login.hidePassword' : 'auth.login.showPassword',
                )}
                onPress={() => {
                  setShowPassword((shown) => !shown);
                }}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={spacing.lg}
                  color={colors.textSecondary}
                />
              </Button>
            }
          />
        )}
      />
      <Button
        minHeight={sizes.touchTarget}
        borderRadius={radius.md}
        backgroundColor={colors.primary}
        disabled={isSubmitting}
        opacity={isSubmitting ? opacity.disabled : undefined}
        onPress={() => void handleSubmit(onSubmit)()}
      >
        <Text color={colors.onPrimary} fontWeight={typography.fontWeight.medium}>
          {translate(isSubmitting ? 'auth.login.submitting' : 'auth.login.submit')}
        </Text>
      </Button>
    </YStack>
  );
}
