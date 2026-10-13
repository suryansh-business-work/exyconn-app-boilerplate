import { describe, expect, it } from 'vitest';
import { resolveRedirect, SHELL_ROUTES } from './routes';

describe('resolveRedirect', () => {
  it.each(['/users', '/users/42?tab=roles', '/'])('returns the local path %s', (from) => {
    expect(resolveRedirect({ from })).toBe(from);
  });

  it.each([
    ['no state', undefined],
    ['null state', null],
    ['state without a path', {}],
    ['a non-string path', { from: 42 }],
    ['an absolute URL', { from: 'https://evil.example/phish' }],
    ['a protocol-relative URL', { from: '//evil.example/phish' }],
    ['a backslash trick', { from: '/\\evil.example' }],
    ['a relative path', { from: 'users' }],
    ['the login page itself', { from: SHELL_ROUTES.login }],
  ])('falls back to home for %s', (_label, state) => {
    expect(resolveRedirect(state)).toBe(SHELL_ROUTES.home);
  });
});
