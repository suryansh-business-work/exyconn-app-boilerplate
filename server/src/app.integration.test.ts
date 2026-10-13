import supertest from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdminDashboardDocument,
  RegisterDocument,
  ReportClientErrorDocument,
  TranslationsDocument,
} from '@common/api';
import { fallbackMessages } from '@common/localization';
import { ROLES } from '@common/types';
import { UserModel } from './modules/auth/user.model';
import { TranslationModel } from './modules/localization/translation.model';
import { seedTranslations } from './seed';
import { captureLogger, startTestApp, type TestApp } from './test/harness';

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

afterEach(() => {
  vi.restoreAllMocks();
});

async function signUp(email: string, roles?: string[]): Promise<string> {
  const result = await testApp.gql(RegisterDocument, {
    input: { name: 'Test User', email, password: 'Str0ngPass' },
  });
  if (!result.data) {
    throw new Error(`Registration failed: ${result.code}`);
  }
  if (roles) {
    await UserModel.updateOne({ email }, { roles });
  }
  return result.data.register.accessToken;
}

describe('GET /health', () => {
  it('reports ok while the database is connected', async () => {
    const response = await supertest(testApp.app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('does not advertise the framework', async () => {
    const response = await supertest(testApp.app).get('/health');
    expect(response.get('x-powered-by')).toBeUndefined();
  });
});

describe('CORS', () => {
  it('allows a configured origin to send credentials and ignores others', async () => {
    const allowed = await supertest(testApp.app)
      .options('/graphql')
      .set('origin', 'http://portal.test')
      .set('access-control-request-method', 'POST');
    expect(allowed.get('access-control-allow-origin')).toBe('http://portal.test');
    expect(allowed.get('access-control-allow-credentials')).toBe('true');

    const refused = await supertest(testApp.app)
      .options('/graphql')
      .set('origin', 'http://evil.test')
      .set('access-control-request-method', 'POST');
    expect(refused.get('access-control-allow-origin')).toBeUndefined();
  });
});

describe('translations', () => {
  it('returns the seeded text for a locale', async () => {
    await seedTranslations(captureLogger().logger);
    const result = await testApp.gql(TranslationsDocument, { locale: 'en' });
    const byKey = new Map(result.data?.translations.map((entry) => [entry.key, entry.value]));
    expect(byKey.size).toBe(Object.keys(fallbackMessages).length);
    expect(byKey.get('auth.login.submit')).toBe(fallbackMessages['auth.login.submit']);
  });

  it('returns an empty list for a locale with no translations', async () => {
    await seedTranslations(captureLogger().logger);
    const result = await testApp.gql(TranslationsDocument, { locale: 'hi' });
    expect(result.data?.translations).toEqual([]);
  });

  it('serves only the requested locale', async () => {
    await TranslationModel.create([
      { locale: 'en', key: 'greeting', value: 'Hello' },
      { locale: 'hi', key: 'greeting', value: 'Namaste' },
    ]);
    const result = await testApp.gql(TranslationsDocument, { locale: 'hi' });
    expect(result.data?.translations).toEqual([{ key: 'greeting', value: 'Namaste' }]);
  });

  it('rejects a malformed locale', async () => {
    const result = await testApp.gql(TranslationsDocument, { locale: 'en; drop' });
    expect(result.code).toBe('BAD_USER_INPUT');
  });
});

describe('adminDashboard', () => {
  it('requires a signed-in user', async () => {
    const result = await testApp.gql(AdminDashboardDocument);
    expect(result.code).toBe('UNAUTHENTICATED');
  });

  it('refuses a user without the admin role and records the attempt', async () => {
    const token = await signUp('user@example.com');
    const result = await testApp.gql(AdminDashboardDocument, {}, { token });
    expect(result.code).toBe('FORBIDDEN');
    expect(testApp.logs).toContainEqual(
      expect.objectContaining({ event: 'auth.forbidden', requiredRole: 'admin' }),
    );
  });

  it('returns the user count to an admin', async () => {
    await signUp('user@example.com');
    const token = await signUp('admin@example.com', [ROLES.admin, ROLES.user]);
    const result = await testApp.gql(AdminDashboardDocument, {}, { token });
    expect(result.code).toBeUndefined();
    expect(result.data?.adminDashboard.totalUsers).toBe(2);
  });

  it('takes effect immediately when the admin role is removed', async () => {
    const token = await signUp('admin@example.com', [ROLES.admin]);
    expect((await testApp.gql(AdminDashboardDocument, {}, { token })).code).toBeUndefined();
    await UserModel.updateOne({ email: 'admin@example.com' }, { roles: [ROLES.user] });
    expect((await testApp.gql(AdminDashboardDocument, {}, { token })).code).toBe('FORBIDDEN');
  });
});

describe('reportClientError', () => {
  const report = {
    name: 'TypeError',
    message: 'Cannot read name of asha@example.com',
    stack: 'TypeError: x\n    at Dashboard (dashboard.tsx:10:3) Bearer abc.def',
    location: '/dashboard',
  };

  it('logs the report with sensitive text redacted and the platform attached', async () => {
    const result = await testApp.gql(
      ReportClientErrorDocument,
      { input: report },
      { native: true },
    );
    expect(result.data?.reportClientError).toBe(true);

    const entry = testApp.logs.find((log) => log.event === 'client.error');
    expect(entry).toMatchObject({
      userId: null,
      report: {
        platform: 'native',
        name: 'TypeError',
        message: 'Cannot read name of [redacted]',
        location: '/dashboard',
      },
    });
    expect(JSON.stringify(entry)).not.toContain('asha@example.com');
    expect(JSON.stringify(entry)).not.toContain('abc.def');
  });

  it('attaches the signed-in user', async () => {
    const token = await signUp('user@example.com');
    await testApp.gql(ReportClientErrorDocument, { input: report }, { token });
    const user = await UserModel.findOne({ email: 'user@example.com' });
    const entry = testApp.logs.find((log) => log.event === 'client.error');
    expect(entry?.userId).toBe(user?.id);
  });

  it('rejects an oversized or empty report', async () => {
    const oversized = await testApp.gql(ReportClientErrorDocument, {
      input: { ...report, stack: 'x'.repeat(4001) },
    });
    expect(oversized.code).toBe('BAD_USER_INPUT');
    const empty = await testApp.gql(ReportClientErrorDocument, {
      input: { name: 'Error', message: '   ' },
    });
    expect(empty.code).toBe('BAD_USER_INPUT');
    expect(testApp.logs.some((log) => log.event === 'client.error')).toBe(false);
  });
});

describe('error handling', () => {
  it('reports a malformed query as bad input', async () => {
    const result = await testApp.gql('query { doesNotExist }');
    expect(result.status).toBe(400);
    expect(result.code).toBe('BAD_USER_INPUT');
  });

  it('masks an unexpected failure from the client but logs it for developers', async () => {
    const token = await signUp('admin@example.com', [ROLES.admin]);
    vi.spyOn(UserModel, 'estimatedDocumentCount').mockRejectedValue(
      new Error('connection lost to mongodb://admin:hunter2@db for dba@example.com'),
    );

    const result = await testApp.gql(AdminDashboardDocument, {}, { token });
    expect(result.code).toBe('INTERNAL_SERVER_ERROR');
    expect(JSON.stringify(result.errors)).not.toContain('mongodb://');

    const entry = testApp.logs.find((log) => log.event === 'graphql.unexpectedError');
    expect(entry).toMatchObject({ operationName: 'AdminDashboard' });
    expect(JSON.stringify(entry)).toContain('connection lost');
    expect(JSON.stringify(entry)).not.toContain('dba@example.com');
  });

  it('logs one request line with the operation name and error codes', async () => {
    await testApp.gql(AdminDashboardDocument);
    expect(testApp.logs).toContainEqual(
      expect.objectContaining({
        event: 'graphql.request',
        operationName: 'AdminDashboard',
        errorCodes: ['UNAUTHENTICATED'],
      }),
    );
  });

  it('rejects a body larger than the limit', async () => {
    const response = await supertest(testApp.app)
      .post('/graphql')
      .set('content-type', 'application/json')
      .send({ query: `query { me { id } } # ${'x'.repeat(200_000)}` });
    expect(response.status).toBe(413);
  });
});
