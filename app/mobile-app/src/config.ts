import { z } from 'zod';
import { HTTP_PROTOCOL_REGEX } from '@common/regex';

const configSchema = z.object({
  EXPO_PUBLIC_API_URL: z.url({ protocol: HTTP_PROTOCOL_REGEX }),
});

export interface AppConfig {
  /** Full URL of the GraphQL endpoint. */
  apiUrl: string;
}

/** Reads build-time configuration, failing loudly if the API URL is missing or malformed. */
export function loadConfig(source: Record<string, unknown>): AppConfig {
  const result = configSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      'EXPO_PUBLIC_API_URL must be set to the full http(s) URL of the GraphQL endpoint',
    );
  }
  return { apiUrl: result.data.EXPO_PUBLIC_API_URL };
}
