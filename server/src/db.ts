import mongoose from 'mongoose';
import type { Logger } from './lib/logger';

const SERVER_SELECTION_TIMEOUT_MS = 10_000;
const CONNECTED = 1;

export async function connectDatabase(uri: string, logger: Logger): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
  // Unique indexes back the duplicate-account guard, so they must exist before traffic arrives.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  logger.info({ event: 'db.connected' });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === CONNECTED;
}
