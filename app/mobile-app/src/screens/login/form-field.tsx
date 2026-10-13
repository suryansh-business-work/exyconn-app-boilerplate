import type { ReactNode } from 'react';
import { Input, Text, XStack, YStack } from 'tamagui';
import { borderWidth, colors, radius, sizes, spacing, typography } from '@common/design-tokens';

export interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  /** Translated validation message, or undefined when the field is valid. */
  error: string | undefined;
  /** HTML-style input type; Tamagui maps it to the right native keyboard and masking. */
  type: 'email' | 'password' | 'text';
  autoComplete: 'email' | 'current-password';
  /** Control shown inside the field's row, after the input (for example a show-password button). */
  trailing?: ReactNode;
}

/** A labelled text input that shows its validation message underneath. */
export function FormField({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  type,
  autoComplete,
  trailing,
}: Readonly<FormFieldProps>) {
  return (
    <YStack gap={spacing.xs}>
      <Text
        fontSize={typography.fontSize.sm}
        fontWeight={typography.fontWeight.medium}
        color={colors.textPrimary}
      >
        {label}
      </Text>
      <XStack alignItems="center" gap={spacing.sm}>
        <XStack
          flex={1}
          borderWidth={borderWidth.thin}
          borderRadius={radius.md}
          borderColor={error ? colors.error : colors.borderStrong}
          backgroundColor={colors.surface}
          overflow="hidden"
        >
          <Input
            flex={1}
            height={sizes.touchTarget}
            borderWidth={borderWidth.none}
            backgroundColor={colors.surface}
            color={colors.textPrimary}
            fontSize={typography.fontSize.md}
            value={value}
            onChangeText={onChangeText}
            onBlur={() => {
              onBlur();
            }}
            type={type}
            autoComplete={autoComplete}
            autoCapitalize="none"
            autoCorrect={false}
            aria-label={label}
            aria-invalid={Boolean(error)}
          />
        </XStack>
        {trailing}
      </XStack>
      {error ? (
        <Text role="alert" fontSize={typography.fontSize.sm} color={colors.error}>
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
