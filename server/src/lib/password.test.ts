import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('Str0ngPass');
    expect(await verifyPassword('Str0ngPass', hash)).toBe(true);
    expect(await verifyPassword('Str0ngPasS', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('never stores the password and salts every hash differently', async () => {
    const [first, second] = await Promise.all([
      hashPassword('Str0ngPass'),
      hashPassword('Str0ngPass'),
    ]);
    expect(first).not.toContain('Str0ngPass');
    expect(first).not.toBe(second);
    expect(first.split('$').slice(0, 4)).toEqual(['scrypt', '32768', '8', '3']);
  });

  it('handles unicode and very long passwords', async () => {
    const password = `पासवर्ड🔐${'x'.repeat(500)}`;
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword(password.slice(0, -1), hash)).toBe(false);
  });

  it.each([
    ['an empty string', ''],
    ['plain text', 'Str0ngPass'],
    ['another algorithm', 'bcrypt$10$8$1$c2FsdA==$a2V5'],
    ['missing parts', 'scrypt$32768$8$3$c2FsdA=='],
    ['non-numeric work factors', 'scrypt$abc$8$3$c2FsdA==$a2V5'],
    ['a zero work factor', 'scrypt$0$8$3$c2FsdA==$a2V5'],
    ['a key of the wrong length', 'scrypt$32768$8$3$c2FsdA==$a2V5'],
  ])('rejects a stored hash that is %s', async (_label, storedHash) => {
    expect(await verifyPassword('Str0ngPass', storedHash)).toBe(false);
  });

  it('refuses an absurd work factor instead of stalling', async () => {
    const key = Buffer.alloc(64).toString('base64');
    const startedAt = performance.now();
    expect(await verifyPassword('Str0ngPass', `scrypt$1073741824$8$3$c2FsdA==$${key}`)).toBe(false);
    expect(performance.now() - startedAt).toBeLessThan(1000);
  });
});
