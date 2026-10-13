import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it.each(['http://localhost:4000/graphql', 'https://api.example.com/graphql'])(
    'accepts %s',
    (url) => {
      expect(loadConfig({ VITE_API_URL: url })).toEqual({ apiUrl: url });
    },
  );

  it.each([
    ['missing', {}],
    ['empty', { VITE_API_URL: '' }],
    ['a relative path', { VITE_API_URL: '/graphql' }],
    ['another scheme', { VITE_API_URL: 'ftp://api.example.com/graphql' }],
    ['a script URL', { VITE_API_URL: 'javascript:alert(1)' }],
    ['not a string', { VITE_API_URL: 4000 }],
  ])('rejects an API URL that is %s', (_label, source) => {
    expect(() => loadConfig(source)).toThrow('VITE_API_URL must be set');
  });
});
