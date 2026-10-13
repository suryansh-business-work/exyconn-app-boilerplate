import type { Server } from 'node:http';
import { createApp } from './app';
import type { Env } from './config/env';
import { connectDatabase, disconnectDatabase } from './db';
import { createLogger, type Logger } from './lib/logger';
import { seedAdmin, seedTranslations } from './seed';

export interface RunningServer {
  port: number;
  stop: () => Promise<void>;
}

function listening(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/** Connects, seeds, and starts listening. `stop` shuts everything down in reverse order. */
export async function startServer(
  env: Env,
  logger: Logger = createLogger(env),
): Promise<RunningServer> {
  await connectDatabase(env.MONGODB_URI, logger);
  await seedAdmin(env, logger);
  await seedTranslations(logger);

  const { app, apollo } = await createApp({ env, logger });
  const server = app.listen(env.PORT);
  await listening(server);

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : env.PORT;
  logger.info({ event: 'server.started', port });

  return {
    port,
    stop: async () => {
      await close(server);
      await apollo.stop();
      await disconnectDatabase();
      logger.info({ event: 'server.stopped' });
    },
  };
}
