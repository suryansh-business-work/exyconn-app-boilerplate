import { sanitizeError } from '@common/error-handling';
import { loadEnv } from './config/env';
import { createLogger } from './lib/logger';
import { startServer } from './server';

const env = loadEnv();
const logger = createLogger(env);

try {
  const running = await startServer(env, logger);
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      running.stop().catch((error: unknown) => {
        logger.error({ event: 'server.stopFailed', error: sanitizeError(error) });
        process.exitCode = 1;
      });
    });
  }
} catch (error) {
  logger.fatal({ event: 'server.startFailed', error: sanitizeError(error) });
  process.exitCode = 1;
}
