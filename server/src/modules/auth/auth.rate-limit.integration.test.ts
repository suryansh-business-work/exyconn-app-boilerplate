import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LoginDocument } from '@common/api';
import { startTestApp, type TestApp } from '../../test/harness';

const AUTH_LIMIT = 3;
const credentials = { email: 'asha@example.com', password: 'Wr0ngPass' };

let testApp: TestApp;

beforeAll(async () => {
  testApp = await startTestApp({ RATE_LIMIT_AUTH_MAX: String(AUTH_LIMIT) });
});

afterAll(async () => {
  await testApp.stop();
});

describe('sign-in rate limit', () => {
  it('blocks further attempts from the same client once the limit is reached', async () => {
    for (let attempt = 0; attempt < AUTH_LIMIT; attempt += 1) {
      const result = await testApp.gql(LoginDocument, { input: credentials });
      expect(result.code).toBe('INVALID_CREDENTIALS');
    }

    const blocked = await testApp.gql(LoginDocument, { input: credentials });
    expect(blocked.code).toBe('RATE_LIMITED');
    expect(blocked.errors[0]?.extensions).toEqual({ code: 'RATE_LIMITED' });
  });
});
