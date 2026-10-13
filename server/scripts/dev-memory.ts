import { MongoMemoryServer } from 'mongodb-memory-server';
import { loadEnv } from '../src/config/env';
import { startServer } from '../src/server';

/**
 * Development entry point for machines without Docker or MongoDB installed:
 * starts a throwaway in-memory database, then the server. All data is lost on exit.
 */
const mongo = await MongoMemoryServer.create();
const running = await startServer(loadEnv({ ...process.env, MONGODB_URI: mongo.getUri() }));

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    running
      .stop()
      .then(() => mongo.stop())
      .catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
      });
  });
}
