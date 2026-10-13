import { describe, expect, it } from 'vitest';
import { createTranslator, DEFAULT_LOCALE, fallbackMessages, resolveLocale } from './index';

const fallback = { greeting: 'Hello {name}', plain: 'Fallback text', count: '{count} of {total}' };

describe('createTranslator', () => {
  it('prefers the server text over the fallback', () => {
    const translate = createTranslator({ plain: 'Server text' }, fallback);
    expect(translate('plain')).toBe('Server text');
  });

  it('uses the fallback when the server has no entry or an empty one', () => {
    expect(createTranslator({}, fallback)('plain')).toBe('Fallback text');
    expect(createTranslator({ plain: '' }, fallback)('plain')).toBe('Fallback text');
  });

  it('returns the key when neither source has it', () => {
    expect(createTranslator({}, fallback)('missing.key')).toBe('missing.key');
  });

  it('fills placeholders, including numbers and zero', () => {
    const translate = createTranslator({}, fallback);
    expect(translate('greeting', { name: 'Asha' })).toBe('Hello Asha');
    expect(translate('count', { count: 0, total: 12 })).toBe('0 of 12');
  });

  it('leaves a placeholder in place when its value is not supplied', () => {
    const translate = createTranslator({}, fallback);
    expect(translate('greeting', {})).toBe('Hello {name}');
    expect(translate('greeting')).toBe('Hello {name}');
  });

  it('fills placeholders in server text too', () => {
    const translate = createTranslator({ greeting: 'Namaste {name}' }, fallback);
    expect(translate('greeting', { name: 'Asha' })).toBe('Namaste Asha');
  });

  it('defaults to the bundled fallback messages', () => {
    expect(createTranslator({})('auth.login.submit')).toBe(fallbackMessages['auth.login.submit']);
  });
});

describe('resolveLocale', () => {
  it.each(['en', 'hi', 'en-IN'])('keeps the well-formed locale %s', (locale) => {
    expect(resolveLocale(locale)).toBe(locale);
  });

  it.each([undefined, null, '', 'English', 'en_IN', 'zh-Hant-TW'])(
    'falls back to the default for %o',
    (candidate) => {
      expect(resolveLocale(candidate)).toBe(DEFAULT_LOCALE);
    },
  );
});

describe('fallback bundle', () => {
  it('is written in the default locale and has no empty entries', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    const empty = Object.entries(fallbackMessages).filter(([, value]) => value.trim() === '');
    expect(empty).toEqual([]);
  });
});
