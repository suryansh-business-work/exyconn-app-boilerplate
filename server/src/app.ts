import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { expressMiddleware } from '@as-integrations/express5';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Env } from './config/env';
import { isDatabaseReady } from './db';
import { createContextFactory, type GraphqlContext } from './graphql/context';
import { loggingPlugin } from './graphql/logging-plugin';
import { resolvers } from './graphql/resolvers';
import { typeDefs } from './graphql/type-defs';
import { formatError } from './lib/graphql-error';
import type { Logger } from './lib/logger';
import { createRateLimiters, rateLimitMiddleware } from './lib/rate-limit';
import { createAuthService } from './modules/auth/auth.service';

const JSON_BODY_LIMIT = '100kb';

export interface AppDeps {
  env: Env;
  logger: Logger;
}

export interface App {
  app: Express;
  apollo: ApolloServer<GraphqlContext>;
}

export async function createApp({ env, logger }: AppDeps): Promise<App> {
  const limiters = createRateLimiters(env);
  const auth = createAuthService({ env, logger });

  const apollo = new ApolloServer<GraphqlContext>({
    typeDefs,
    resolvers,
    formatError,
    includeStacktraceInErrorResponses: false,
    introspection: env.NODE_ENV !== 'production',
    plugins: [ApolloServerPluginLandingPageDisabled(), loggingPlugin(logger)],
  });
  await apollo.start();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(helmet());

  app.get('/health', (_req, res) => {
    const ready = isDatabaseReady();
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
  });

  app.use(
    '/graphql',
    cors({ origin: env.CORS_ORIGINS, credentials: true }),
    rateLimitMiddleware(limiters.general),
    express.json({ limit: JSON_BODY_LIMIT }),
    cookieParser(),
    expressMiddleware(apollo, { context: createContextFactory({ env, logger, auth, limiters }) }),
  );

  return { app, apollo };
}
