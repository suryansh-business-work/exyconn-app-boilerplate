import { loadConfig } from './config';

describe('loadConfig', () => {
  it.each(['http://10.0.2.2:4000/graphql', 'https://api.example.com/graphql'])(
    'accepts %s',
    (url) => {
      expect(loadConfig({ EXPO_PUBLIC_API_URL: url })).toEqual({ apiUrl: url });
    },
  );

  it.each([
    ['missing', {}],
    ['undefined', { EXPO_PUBLIC_API_URL: undefined }],
    ['empty', { EXPO_PUBLIC_API_URL: '' }],
    ['a relative path', { EXPO_PUBLIC_API_URL: '/graphql' }],
    ['another scheme', { EXPO_PUBLIC_API_URL: 'ftp://api.example.com/graphql' }],
  ])('rejects an API URL that is %s', (_label, source) => {
    expect(() => loadConfig(source)).toThrow('EXPO_PUBLIC_API_URL must be set');
  });
});
