import { loadConfig } from './config';

describe('loadConfig', () => {
  it.each(['http://10.0.2.2:4000/graphql', 'https://api.example.com/graphql'])(
    'accepts %s',
    (apiUrl) => {
      expect(loadConfig({ apiUrl })).toEqual({ apiUrl });
    },
  );

  it('ignores unrelated embedded values', () => {
    expect(loadConfig({ apiUrl: 'https://api.example.com/graphql', eas: {} })).toEqual({
      apiUrl: 'https://api.example.com/graphql',
    });
  });

  it.each([
    ['no embedded configuration', undefined],
    ['an empty configuration', {}],
    ['an undefined URL', { apiUrl: undefined }],
    ['an empty URL', { apiUrl: '' }],
    ['a relative path', { apiUrl: '/graphql' }],
    ['another scheme', { apiUrl: 'ftp://api.example.com/graphql' }],
  ])('rejects %s', (_label, extra) => {
    expect(() => loadConfig(extra)).toThrow('built without a valid API URL');
  });
});
