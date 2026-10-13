import { describe, expect, it } from 'vitest';
import {
  DIGIT_REGEX,
  EMAIL_REGEX,
  EMBEDDED_BEARER_REGEX,
  EMBEDDED_EMAIL_REGEX,
  EMBEDDED_JWT_REGEX,
  HTTP_PROTOCOL_REGEX,
  LOCALE_REGEX,
  LOWERCASE_LETTER_REGEX,
  MESSAGE_PLACEHOLDER_REGEX,
  PERSON_NAME_REGEX,
  UPPERCASE_LETTER_REGEX,
} from './index';

describe('EMAIL_REGEX', () => {
  it.each(['a@b.co', 'first.last+tag@sub.example.com', 'user_1@example.co.in'])(
    'accepts %s',
    (value) => {
      expect(EMAIL_REGEX.test(value)).toBe(true);
    },
  );

  it.each([
    '',
    'plain',
    '@example.com',
    'user@',
    'user@example',
    'user@.com',
    'user@example..com',
    'user@example.com.',
    'us er@example.com',
    'user@@example.com',
  ])('rejects "%s"', (value) => {
    expect(EMAIL_REGEX.test(value)).toBe(false);
  });

  it('stays fast on a long hostile input', () => {
    const hostile = `${'a'.repeat(50_000)}@${'b.'.repeat(25_000)}`;
    const startedAt = performance.now();
    expect(EMAIL_REGEX.test(hostile)).toBe(false);
    expect(performance.now() - startedAt).toBeLessThan(500);
  });
});

describe('PERSON_NAME_REGEX', () => {
  it.each(['Asha', "Conor O'Brien", 'Jean-Luc', 'Dr. Meera Nair', 'José', 'सूर्यांश'])(
    'accepts %s',
    (value) => {
      expect(PERSON_NAME_REGEX.test(value)).toBe(true);
    },
  );

  it.each(['', ' Asha', '1Asha', 'Asha<script>', 'Asha_1', '-Asha'])('rejects "%s"', (value) => {
    expect(PERSON_NAME_REGEX.test(value)).toBe(false);
  });
});

describe('character class patterns', () => {
  it('detects uppercase, lowercase and digits independently', () => {
    expect(UPPERCASE_LETTER_REGEX.test('abcD')).toBe(true);
    expect(UPPERCASE_LETTER_REGEX.test('abc1')).toBe(false);
    expect(LOWERCASE_LETTER_REGEX.test('ABCd')).toBe(true);
    expect(LOWERCASE_LETTER_REGEX.test('ABC1')).toBe(false);
    expect(DIGIT_REGEX.test('abc1')).toBe(true);
    expect(DIGIT_REGEX.test('abcD')).toBe(false);
  });
});

describe('LOCALE_REGEX', () => {
  it.each(['en', 'hi', 'fil', 'en-IN', 'pt-BR'])('accepts %s', (value) => {
    expect(LOCALE_REGEX.test(value)).toBe(true);
  });

  it.each(['', 'e', 'EN', 'en-in', 'en_IN', 'english', 'en-INDIA', '$ne'])(
    'rejects "%s"',
    (value) => {
      expect(LOCALE_REGEX.test(value)).toBe(false);
    },
  );
});

describe('HTTP_PROTOCOL_REGEX', () => {
  it('accepts http and https only', () => {
    expect(HTTP_PROTOCOL_REGEX.test('http')).toBe(true);
    expect(HTTP_PROTOCOL_REGEX.test('https')).toBe(true);
    expect(HTTP_PROTOCOL_REGEX.test('ftp')).toBe(false);
    expect(HTTP_PROTOCOL_REGEX.test('javascript')).toBe(false);
    expect(HTTP_PROTOCOL_REGEX.test('httpsx')).toBe(false);
  });
});

describe('MESSAGE_PLACEHOLDER_REGEX', () => {
  it('captures every placeholder name', () => {
    const names = [...'Hi {name}, you have {count} items'.matchAll(MESSAGE_PLACEHOLDER_REGEX)].map(
      (match) => match[1],
    );
    expect(names).toEqual(['name', 'count']);
  });

  it('ignores empty or malformed braces', () => {
    expect([...'{} { name } {na-me}'.matchAll(MESSAGE_PLACEHOLDER_REGEX)]).toHaveLength(0);
  });
});

describe('redaction patterns', () => {
  it('finds emails inside free text', () => {
    expect('failed for asha@example.com and b.c@x.io!'.match(EMBEDDED_EMAIL_REGEX)).toEqual([
      'asha@example.com',
      'b.c@x.io',
    ]);
  });

  it('finds JWTs inside free text', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-DEF_123';
    expect(`token=${jwt};`.match(EMBEDDED_JWT_REGEX)).toEqual([jwt]);
    expect('eyJ.only-two.'.match(EMBEDDED_JWT_REGEX)).toBeNull();
  });

  it('finds bearer credentials regardless of case', () => {
    expect('authorization: bearer abc.DEF-123== next'.match(EMBEDDED_BEARER_REGEX)).toEqual([
      'bearer abc.DEF-123==',
    ]);
  });
});
