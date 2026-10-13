import { z } from 'zod';
import { HTTP_PROTOCOL_REGEX } from '@common/regex';

const configSchema = z.object({
  apiUrl: z.url({ protocol: HTTP_PROTOCOL_REGEX }),
});

export interface AppConfig {
  /** Full URL of the GraphQL endpoint. */
  apiUrl: string;
}

/**
 * Reads the configuration embedded in the app at build time (the `extra` block
 * produced by app.config.ts), failing loudly if the API URL is missing or malformed.
 */
export function loadConfig(extra: unknown): AppConfig {
  const result = configSchema.safeParse(extra);
  if (!result.success) {
    throw new Error(
      'The app was built without a valid API URL. Set APP_API_URL to the full http(s) URL of the GraphQL endpoint and rebuild.',
    );
  }
  return result.data;
}
