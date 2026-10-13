import { z } from 'zod';
import {
  DIGIT_REGEX,
  EMAIL_REGEX,
  LOCALE_REGEX,
  LOWERCASE_LETTER_REGEX,
  PERSON_NAME_REGEX,
  UPPERCASE_LETTER_REGEX,
} from '@common/regex';
import { CLIENT_PLATFORMS } from '@common/types';

/**
 * Validation messages are localization keys, not text. Clients translate them
 * with `@common/localization`; the server returns them as-is.
 */

export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 100;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'validation.emailRequired')
  .max(EMAIL_MAX_LENGTH, 'validation.emailInvalid')
  .regex(EMAIL_REGEX, 'validation.emailInvalid');

/** Password rules for creating or changing a password. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'validation.passwordTooShort')
  .max(PASSWORD_MAX_LENGTH, 'validation.passwordTooLong')
  .regex(UPPERCASE_LETTER_REGEX, 'validation.passwordNeedsUppercase')
  .regex(LOWERCASE_LETTER_REGEX, 'validation.passwordNeedsLowercase')
  .regex(DIGIT_REGEX, 'validation.passwordNeedsDigit');

export const personNameSchema = z
  .string()
  .trim()
  .min(1, 'validation.nameRequired')
  .max(NAME_MAX_LENGTH, 'validation.nameTooLong')
  .regex(PERSON_NAME_REGEX, 'validation.nameInvalid');

/** Login only checks presence and size: strength rules may change after an account was created. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'validation.passwordRequired')
    .max(PASSWORD_MAX_LENGTH, 'validation.passwordTooLong'),
});

export const registerSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export const localeSchema = z.string().regex(LOCALE_REGEX, 'validation.localeInvalid');

export const clientErrorReportSchema = z.object({
  platform: z.enum(CLIENT_PLATFORMS),
  name: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(500),
  stack: z.string().max(4000).optional(),
  componentStack: z.string().max(4000).optional(),
  location: z.string().max(300).optional(),
  appVersion: z.string().max(50).optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ClientErrorReport = z.infer<typeof clientErrorReportSchema>;
