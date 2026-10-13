import { z } from 'zod';
import { emailSchema, newPasswordSchema, personNameSchema } from '@common/validators';

const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  RATE_LIMIT_GENERAL_MAX: z.coerce.number().int().positive().default(600),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(20),
  SEED_ADMIN_NAME: z.preprocess(emptyToUndefined, personNameSchema.optional()),
  SEED_ADMIN_EMAIL: z.preprocess(emptyToUndefined, emailSchema.optional()),
  SEED_ADMIN_PASSWORD: z.preprocess(emptyToUndefined, newPasswordSchema.optional()),
});

export type Env = z.infer<typeof envSchema>;

/** Reads and validates configuration. Fails fast, naming each bad variable but never its value. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }
  return result.data;
}

/** Cookies are only marked Secure where the server is reached over HTTPS. */
export function usesSecureCookies(env: Env): boolean {
  return env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';
}
