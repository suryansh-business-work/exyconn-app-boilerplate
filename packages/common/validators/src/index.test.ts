import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import {
  clientErrorReportSchema,
  emailSchema,
  localeSchema,
  loginSchema,
  newPasswordSchema,
  PASSWORD_MAX_LENGTH,
  personNameSchema,
  registerSchema,
} from './index';

function firstIssue(schema: ZodType, value: unknown): string | undefined {
  const result = schema.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('emailSchema', () => {
  it('trims and lowercases a valid address', () => {
    expect(emailSchema.parse('  Asha@Example.COM ')).toBe('asha@example.com');
  });

  it.each([
    ['', 'validation.emailRequired'],
    ['   ', 'validation.emailRequired'],
    ['not-an-email', 'validation.emailInvalid'],
    [`${'a'.repeat(250)}@x.io`, 'validation.emailInvalid'],
  ])('rejects "%s" with %s', (value, message) => {
    expect(firstIssue(emailSchema, value)).toBe(message);
  });
});

describe('newPasswordSchema', () => {
  it('accepts a password that meets every rule', () => {
    expect(newPasswordSchema.parse('Str0ngPass')).toBe('Str0ngPass');
  });

  it.each([
    ['Sh0rt', 'validation.passwordTooShort'],
    ['alllowercase1', 'validation.passwordNeedsUppercase'],
    ['ALLUPPERCASE1', 'validation.passwordNeedsLowercase'],
    ['NoDigitsHere', 'validation.passwordNeedsDigit'],
    [`Aa1${'x'.repeat(PASSWORD_MAX_LENGTH)}`, 'validation.passwordTooLong'],
  ])('rejects "%s" with %s', (value, message) => {
    expect(firstIssue(newPasswordSchema, value)).toBe(message);
  });

  it('accepts exactly the minimum and maximum lengths', () => {
    expect(newPasswordSchema.safeParse('Abcdefg1').success).toBe(true);
    expect(newPasswordSchema.safeParse(`Aa1${'x'.repeat(PASSWORD_MAX_LENGTH - 3)}`).success).toBe(
      true,
    );
  });
});

describe('personNameSchema', () => {
  it('trims surrounding whitespace', () => {
    expect(personNameSchema.parse('  Asha Rao ')).toBe('Asha Rao');
  });

  it.each([
    ['', 'validation.nameRequired'],
    ['x'.repeat(101), 'validation.nameTooLong'],
    ['Asha <b>', 'validation.nameInvalid'],
  ])('rejects "%s" with %s', (value, message) => {
    expect(firstIssue(personNameSchema, value)).toBe(message);
  });
});

describe('loginSchema', () => {
  it('normalizes the email and keeps the password untouched', () => {
    expect(loginSchema.parse({ email: ' A@B.io ', password: ' weak ' })).toEqual({
      email: 'a@b.io',
      password: ' weak ',
    });
  });

  it('does not apply strength rules to an existing password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.io', password: 'x' }).success).toBe(true);
  });

  it('requires a password and caps its length', () => {
    expect(firstIssue(loginSchema, { email: 'a@b.io', password: '' })).toBe(
      'validation.passwordRequired',
    );
    expect(
      firstIssue(loginSchema, { email: 'a@b.io', password: 'x'.repeat(PASSWORD_MAX_LENGTH + 1) }),
    ).toBe('validation.passwordTooLong');
  });
});

describe('registerSchema', () => {
  it('accepts and normalizes a valid registration', () => {
    expect(
      registerSchema.parse({ name: ' Asha ', email: 'ASHA@example.com', password: 'Str0ngPass' }),
    ).toEqual({ name: 'Asha', email: 'asha@example.com', password: 'Str0ngPass' });
  });

  it('reports every invalid field', () => {
    const result = registerSchema.safeParse({ name: '', email: 'bad', password: 'weak' });
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path[0]);
    expect(new Set(paths)).toEqual(new Set(['name', 'email', 'password']));
  });
});

describe('localeSchema', () => {
  it('accepts locale tags and rejects anything else', () => {
    expect(localeSchema.parse('en-IN')).toBe('en-IN');
    expect(firstIssue(localeSchema, 'English')).toBe('validation.localeInvalid');
    expect(firstIssue(localeSchema, '')).toBe('validation.localeInvalid');
  });
});

describe('clientErrorReportSchema', () => {
  const valid = { platform: 'web', name: 'TypeError', message: 'x is undefined' };

  it('accepts a minimal report', () => {
    expect(clientErrorReportSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an unknown platform, an empty message and an oversized stack', () => {
    expect(clientErrorReportSchema.safeParse({ ...valid, platform: 'desktop' }).success).toBe(
      false,
    );
    expect(clientErrorReportSchema.safeParse({ ...valid, message: '  ' }).success).toBe(false);
    expect(clientErrorReportSchema.safeParse({ ...valid, stack: 'x'.repeat(4001) }).success).toBe(
      false,
    );
  });
});
