import { LOCALE_REGEX, MESSAGE_PLACEHOLDER_REGEX } from '@common/regex';
import { DEFAULT_LOCALE, fallbackMessages } from './fallback/en';

/** Returns the candidate when it is a well-formed locale tag, otherwise the default locale. */
export function resolveLocale(candidate: string | null | undefined): string {
  return candidate && LOCALE_REGEX.test(candidate) ? candidate : DEFAULT_LOCALE;
}

export type Messages = Readonly<Record<string, string>>;
export type TranslateParams = Readonly<Record<string, string | number>>;
export type Translate = (key: string, params?: TranslateParams) => string;

/**
 * Builds a translate function. The server's text wins; the bundled fallback is
 * used only for keys the server did not provide, and the key itself is returned
 * when neither has it, so a missing translation is visible instead of blank.
 */
export function createTranslator(
  serverMessages: Messages,
  fallback: Messages = fallbackMessages,
): Translate {
  return (key, params) => {
    const template = serverMessages[key] || fallback[key] || key;
    if (!params) {
      return template;
    }
    return template.replaceAll(MESSAGE_PLACEHOLDER_REGEX, (placeholder, name: string) =>
      name in params ? String(params[name]) : placeholder,
    );
  };
}
