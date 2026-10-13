import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LoginDocument } from '@common/api';
import { startServer, type RunningServer } from './server';
import { captureLogger, testEnv } from './test/harness';

const admin = { name: 'First Admin', email: 'admin@example.com', password: 'Adm1nPassword' };

let mongo: MongoMemoryServer;
let running: RunningServer;
const { logger, logs } = captureLogger();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const env = testEnv({
    MONGODB_URI: mongo.getUri(),
    SEED_ADMIN_NAME: admin.name,
    SEED_ADMIN_EMAIL: admin.email,
    SEED_ADMIN_PASSWORD: admin.password,
  });
  // PORT=0 is not accepted by configuration; ask the OS for a free port in tests only.
  running = await startServer({ ...env, PORT: 0 }, logger);
});

afterAll(async () => {
  await mongo.stop();
});

describe('startServer', () => {
  it('listens, reports healthy and lets the seeded admin sign in over HTTP', async () => {
    const baseUrl = `http://127.0.0.1:${running.port}`;
    expect(running.port).toBeGreaterThan(0);

    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);

    const login = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: LoginDocument.toString(),
        variables: { input: { email: admin.email, password: admin.password } },
      }),
    });
    const body = (await login.json()) as {
      data: { login: { user: { email: string; roles: string[] } } };
    };
    expect(body.data.login.user).toMatchObject({ email: admin.email, roles: ['admin', 'user'] });
    expect(logs).toContainEqual(expect.objectContaining({ event: 'server.started' }));
  });

  it('stops accepting connections after stop()', async () => {
    const baseUrl = `http://127.0.0.1:${running.port}`;
    await running.stop();
    await expect(fetch(`${baseUrl}/health`)).rejects.toThrow();
    expect(logs).toContainEqual(expect.objectContaining({ event: 'server.stopped' }));
  });
});
