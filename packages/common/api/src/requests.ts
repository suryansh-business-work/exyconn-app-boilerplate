import type { GraphqlClient } from './client';
import { ReportClientErrorDocument, TranslationsDocument } from './generated/graphql';
import type { ClientErrorInput } from './generated/graphql';

/** Requests every app makes at startup or from its error boundary, shared by web and native. */

/** Loads the server's translations for a locale as a key-to-text map. */
export async function fetchTranslations(
  client: GraphqlClient,
  locale: string,
): Promise<Record<string, string>> {
  const data = await client.execute(TranslationsDocument, { locale });
  return Object.fromEntries(data.translations.map(({ key, value }) => [key, value]));
}

/** Sends an error-boundary report. The server adds the platform and the signed-in user. */
export async function sendClientErrorReport(
  client: GraphqlClient,
  report: ClientErrorInput,
): Promise<void> {
  await client.execute(ReportClientErrorDocument, { input: report });
}
