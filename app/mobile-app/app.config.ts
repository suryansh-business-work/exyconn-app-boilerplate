import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json with values that differ per environment. `APP_API_URL` is
 * read when the app is built (locally or in GitHub Actions) and embedded in the
 * app, so the installed app needs no environment of its own.
 */
export default function appConfig({ config }: ConfigContext): ExpoConfig {
  return {
    ...config,
    name: config.name ?? '',
    slug: config.slug ?? '',
    extra: {
      ...config.extra,
      apiUrl: process.env.APP_API_URL,
    },
  };
}
