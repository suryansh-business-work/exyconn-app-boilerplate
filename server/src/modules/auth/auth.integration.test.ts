import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  LoginDocument,
  LogoutDocument,
  RefreshSessionDocument,
  RegisterDocument,
} from '@common/api';
import { startTestApp, type TestApp } from '../../test/harness';
import { SessionModel } from './session.model';
import { USER_STATUS, UserModel } from './user.model';

const ME_QUERY = 'query { me { id email name roles } }';
const asha = { name: 'Asha Rao', email: 'asha@example.com', password: 'Str0ngPass' };

interface MeResult {
  me: { id: string; email: string; name: string; roles: string[] } | null;
}

let testApp: TestApp;

beforeAll(async () => {
  testApp = await startTestApp();
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await testApp.reset();
});

async function registerAsha(native = false) {
  const result = await testApp.gql(RegisterDocument, { input: asha }, { native });
  if (!result.data) {
    throw new Error(`Registration failed: ${result.code}`);
  }
  return { ...result, session: result.data.register };
}

describe('register', () => {
  it('creates the account, signs the user in and sets an httpOnly refresh cookie for web', async () => {
    const { session, setCookies, refreshCookie } = await registerAsha();

    expect(session.user).toMatchObject({
      email: 'asha@example.com',
      name: 'Asha Rao',
      roles: ['user'],
    });
    expect(session.refreshToken).toBeNull();
    expect(refreshCookie).toBeTruthy();
    expect(setCookies[0]).toMatch(/HttpOnly/i);
    expect(setCookies[0]).toMatch(/SameSite=Lax/i);
    expect(setCookies[0]).toMatch(/Path=\/graphql/i);
    expect(new Date(session.accessTokenExpiresAt).getTime()).toBeGreaterThan(Date.now());

    const stored = await UserModel.findOne({ email: asha.email }).lean();
    expect(stored?.passwordHash).toMatch(/^scrypt\$/);
    expect(stored?.passwordHash).not.toContain(asha.password);
  });

  it('returns the refresh token in the body, and no cookie, for native clients', async () => {
    const { session, setCookies } = await registerAsha(true);
    expect(session.refreshToken).toBeTruthy();
    expect(setCookies).toEqual([]);
  });

  it('normalizes the email so a differently-cased duplicate is refused', async () => {
    await registerAsha();
    const duplicate = await testApp.gql(RegisterDocument, {
      input: { ...asha, email: '  ASHA@Example.com ' },
    });
    expect(duplicate.code).toBe('EMAIL_TAKEN');
    expect(await UserModel.countDocuments()).toBe(1);
  });

  it('lets only one of two simultaneous sign-ups with the same email succeed', async () => {
    const results = await Promise.all([
      testApp.gql(RegisterDocument, { input: asha }),
      testApp.gql(RegisterDocument, { input: asha }),
    ]);
    expect(results.map((result) => result.code).sort()).toEqual(['EMAIL_TAKEN', undefined]);
    expect(await UserModel.countDocuments()).toBe(1);
  });

  it('rejects invalid details field by field and stores nothing', async () => {
    const result = await testApp.gql(RegisterDocument, {
      input: { name: '', email: 'not-an-email', password: 'weak' },
    });
    expect(result.code).toBe('BAD_USER_INPUT');
    expect(result.errors[0]?.extensions?.fieldErrors).toEqual({
      name: 'validation.nameRequired',
      email: 'validation.emailInvalid',
      password: 'validation.passwordTooShort',
    });
    expect(await UserModel.countDocuments()).toBe(0);
  });
});

describe('login', () => {
  beforeEach(async () => {
    await registerAsha();
  });

  it('signs in with the right password, ignoring email case and whitespace', async () => {
    const result = await testApp.gql(LoginDocument, {
      input: { email: ' Asha@Example.COM ', password: asha.password },
    });
    expect(result.code).toBeUndefined();
    expect(result.data?.login.user.email).toBe('asha@example.com');
    expect(result.refreshCookie).toBeTruthy();
  });

  it.each([
    ['a wrong password', { email: asha.email, password: 'Wr0ngPass' }],
    ['an unknown email', { email: 'nobody@example.com', password: asha.password }],
  ])('gives the same INVALID_CREDENTIALS answer for %s', async (_label, input) => {
    const result = await testApp.gql(LoginDocument, { input });
    expect(result.code).toBe('INVALID_CREDENTIALS');
    expect(result.data).toBeNull();
    expect(result.refreshCookie).toBeUndefined();
  });

  it('refuses a disabled account even with the right password', async () => {
    await UserModel.updateOne({ email: asha.email }, { status: USER_STATUS.disabled });
    const result = await testApp.gql(LoginDocument, {
      input: { email: asha.email, password: asha.password },
    });
    expect(result.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects empty credentials before touching the database', async () => {
    const result = await testApp.gql(LoginDocument, { input: { email: '', password: '' } });
    expect(result.code).toBe('BAD_USER_INPUT');
    expect(result.errors[0]?.extensions?.fieldErrors).toEqual({
      email: 'validation.emailRequired',
      password: 'validation.passwordRequired',
    });
  });

  it('never writes the password or email to the logs', async () => {
    await testApp.gql(LoginDocument, { input: { email: asha.email, password: 'Wr0ngPass' } });
    await testApp.gql(LoginDocument, { input: { email: asha.email, password: asha.password } });
    const serialized = JSON.stringify(testApp.logs);
    expect(serialized).toContain('auth.login.failed');
    expect(serialized).toContain('"auth.login"');
    expect(serialized).not.toContain(asha.password);
    expect(serialized).not.toContain('Wr0ngPass');
    expect(serialized).not.toContain(asha.email);
  });
});

describe('me', () => {
  it('returns the signed-in user for a valid access token', async () => {
    const { session } = await registerAsha();
    const result = await testApp.gql<MeResult, undefined>(ME_QUERY, undefined, {
      token: session.accessToken,
    });
    expect(result.data?.me).toEqual(session.user);
  });

  it.each([
    ['no token', undefined],
    ['a malformed token', 'not-a-token'],
  ])('returns null with %s', async (_label, token) => {
    const result = await testApp.gql<MeResult, undefined>(
      ME_QUERY,
      undefined,
      token ? { token } : {},
    );
    expect(result.code).toBeUndefined();
    expect(result.data?.me).toBeNull();
  });

  it('stops recognizing a user as soon as the account is disabled', async () => {
    const { session } = await registerAsha();
    await UserModel.updateOne({ email: asha.email }, { status: USER_STATUS.disabled });
    const result = await testApp.gql<MeResult, undefined>(ME_QUERY, undefined, {
      token: session.accessToken,
    });
    expect(result.data?.me).toBeNull();
  });
});

describe('refreshSession', () => {
  it('rotates the web cookie: the new one works and the old one is dead', async () => {
    const { refreshCookie: firstCookie } = await registerAsha();

    const refreshed = await testApp.gql(RefreshSessionDocument, {}, { cookie: firstCookie });
    expect(refreshed.code).toBeUndefined();
    expect(refreshed.data?.refreshSession.user.email).toBe(asha.email);
    expect(refreshed.refreshCookie).toBeTruthy();
    expect(refreshed.refreshCookie).not.toBe(firstCookie);

    const replayed = await testApp.gql(RefreshSessionDocument, {}, { cookie: firstCookie });
    expect(replayed.code).toBe('UNAUTHENTICATED');
    // The dead cookie is cleared so the browser stops sending it.
    expect(replayed.setCookies[0]).toMatch(/refresh_token=;/);

    const again = await testApp.gql(
      RefreshSessionDocument,
      {},
      { cookie: refreshed.refreshCookie },
    );
    expect(again.code).toBeUndefined();
  });

  it('rotates a native token passed as an argument', async () => {
    const { session } = await registerAsha(true);
    const refreshed = await testApp.gql(
      RefreshSessionDocument,
      { refreshToken: session.refreshToken },
      { native: true },
    );
    expect(refreshed.data?.refreshSession.refreshToken).toBeTruthy();
    expect(refreshed.data?.refreshSession.refreshToken).not.toBe(session.refreshToken);
    expect(refreshed.setCookies).toEqual([]);
  });

  it('lets a refresh token be redeemed only once, even by simultaneous requests', async () => {
    const { session } = await registerAsha(true);
    const results = await Promise.all([
      testApp.gql(RefreshSessionDocument, { refreshToken: session.refreshToken }, { native: true }),
      testApp.gql(RefreshSessionDocument, { refreshToken: session.refreshToken }, { native: true }),
    ]);
    expect(results.map((result) => result.code).sort()).toEqual(['UNAUTHENTICATED', undefined]);
  });

  it.each([
    ['no token at all', undefined],
    ['a token that was never issued', 'made-up-token'],
  ])('refuses %s', async (_label, cookie) => {
    const result = await testApp.gql(RefreshSessionDocument, {}, cookie ? { cookie } : {});
    expect(result.code).toBe('UNAUTHENTICATED');
  });

  it('refuses an expired session', async () => {
    const { refreshCookie } = await registerAsha();
    await SessionModel.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    const result = await testApp.gql(RefreshSessionDocument, {}, { cookie: refreshCookie });
    expect(result.code).toBe('UNAUTHENTICATED');
  });

  it('refuses to refresh for a disabled account', async () => {
    const { refreshCookie } = await registerAsha();
    await UserModel.updateOne({ email: asha.email }, { status: USER_STATUS.disabled });
    const result = await testApp.gql(RefreshSessionDocument, {}, { cookie: refreshCookie });
    expect(result.code).toBe('UNAUTHENTICATED');
  });

  it('stores only a hash of the refresh token', async () => {
    const { session } = await registerAsha(true);
    const stored = await SessionModel.find().lean();
    expect(stored).toHaveLength(1);
    expect(JSON.stringify(stored)).not.toContain(session.refreshToken);
  });
});

describe('logout', () => {
  it('revokes the session and clears the cookie', async () => {
    const { refreshCookie } = await registerAsha();

    const loggedOut = await testApp.gql(LogoutDocument, {}, { cookie: refreshCookie });
    expect(loggedOut.data?.logout).toBe(true);
    expect(loggedOut.setCookies[0]).toMatch(/refresh_token=;/);

    const afterLogout = await testApp.gql(RefreshSessionDocument, {}, { cookie: refreshCookie });
    expect(afterLogout.code).toBe('UNAUTHENTICATED');
  });

  it('succeeds when repeated, with an unknown token, or with none', async () => {
    const { session } = await registerAsha(true);
    const variables = { refreshToken: session.refreshToken };
    expect((await testApp.gql(LogoutDocument, variables, { native: true })).data?.logout).toBe(
      true,
    );
    expect((await testApp.gql(LogoutDocument, variables, { native: true })).data?.logout).toBe(
      true,
    );
    expect((await testApp.gql(LogoutDocument, { refreshToken: 'unknown' })).data?.logout).toBe(
      true,
    );
    expect((await testApp.gql(LogoutDocument, {})).data?.logout).toBe(true);
  });

  it('leaves other devices of the same user signed in', async () => {
    const phone = await registerAsha(true);
    const laptop = await testApp.gql(
      LoginDocument,
      { input: { email: asha.email, password: asha.password } },
      { native: true },
    );
    await testApp.gql(
      LogoutDocument,
      { refreshToken: phone.session.refreshToken },
      { native: true },
    );

    const laptopRefresh = await testApp.gql(
      RefreshSessionDocument,
      { refreshToken: laptop.data?.login.refreshToken },
      { native: true },
    );
    expect(laptopRefresh.code).toBeUndefined();
  });
});
