import { randomBytes } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { CLIENT_PLATFORM_HEADER } from '@common/types';
import { createApp } from '../app';
import { loadEnv, type Env } from '../config/env';
import { connectDatabase, disconnectDatabase } from '../db';
import { createLogger } from '../lib/logger';
import { REFRESH_COOKIE_NAME } from '../modules/auth/auth.resolvers';

/** A document as the generated client exposes it: its text plus phantom result/variable types. */
interface TypedDocument<TResult, TVariables> {
  toString(): string;
  __apiType?: (variables: TVariables) => TResult;
}

export interface RequestOptions {
  token?: string;
  cookie?: string;
  native?: boolean;
}

export interface GraphqlResult<TResult> {
  status: number;
  data: TResult | null;
  /** `extensions.code` of the first error, if any. */
  code: string | undefined;
  errors: { message: string; extensions?: Record<string, unknown> }[];
  /** Value of the refresh cookie set by this response, or undefined if none was set. */
  refreshCookie: string | undefined;
  setCookies: string[];
}

export type LogEntry = Record<string, unknown>;

function readRefreshCookie(setCookies: string[]): string | undefined {
  const prefix = `${REFRESH_COOKIE_NAME}=`;
  const cookie = setCookies.find((entry) => entry.startsWith(prefix));
  return cookie?.slice(prefix.length).split(';')[0];
}

export function testEnv(overrides: Record<string, string> = {}): Env {
  return loadEnv({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://unused',
    JWT_ACCESS_SECRET: randomBytes(32).toString('hex'),
    CORS_ORIGINS: 'http://portal.test',
    RATE_LIMIT_AUTH_MAX: '10000',
    RATE_LIMIT_GENERAL_MAX: '10000',
    ...overrides,
  });
}

export function captureLogger(): { logger: ReturnType<typeof createLogger>; logs: LogEntry[] } {
  const logs: LogEntry[] = [];
  const logger = createLogger(
    { LOG_LEVEL: 'info' },
    { write: (line: string) => void logs.push(JSON.parse(line) as LogEntry) },
  );
  return { logger, logs };
}

export async function startTestApp(overrides: Record<string, string> = {}) {
  const mongo = await MongoMemoryServer.create();
  const env = testEnv({ MONGODB_URI: mongo.getUri(), ...overrides });
  const { logger, logs } = captureLogger();
  await connectDatabase(env.MONGODB_URI, logger);
  const { app, apollo } = await createApp({ env, logger });

  async function gql<TResult, TVariables>(
    document: TypedDocument<TResult, TVariables> | string,
    variables?: TVariables,
    options: RequestOptions = {},
  ): Promise<GraphqlResult<TResult>> {
    const request = supertest(app).post('/graphql').set('content-type', 'application/json');
    if (options.token) {
      request.set('authorization', `Bearer ${options.token}`);
    }
    if (options.native) {
      request.set(CLIENT_PLATFORM_HEADER, 'native');
    }
    if (options.cookie) {
      request.set('cookie', `${REFRESH_COOKIE_NAME}=${options.cookie}`);
    }
    const response = await request.send({ query: document.toString(), variables });
    const body = response.body as {
      data?: TResult | null;
      errors?: GraphqlResult<TResult>['errors'];
    };
    const errors = body.errors ?? [];
    const firstCode = errors[0]?.extensions?.code;
    const header: unknown = response.get('set-cookie');
    const setCookies = Array.isArray(header) ? (header as string[]) : [];
    return {
      status: response.status,
      data: body.data ?? null,
      code: typeof firstCode === 'string' ? firstCode : undefined,
      errors,
      refreshCookie: readRefreshCookie(setCookies),
      setCookies,
    };
  }

  return {
    app,
    env,
    logs,
    gql,
    /** Empties every collection so tests do not see each other's data. */
    reset: async () => {
      await Promise.all(
        Object.values(mongoose.connection.collections).map((collection) =>
          collection.deleteMany({}),
        ),
      );
      logs.length = 0;
    },
    stop: async () => {
      await apollo.stop();
      await disconnectDatabase();
      await mongo.stop();
    },
  };
}

export type TestApp = Awaited<ReturnType<typeof startTestApp>>;
