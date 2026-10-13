import { redactSensitive } from '@common/error-handling';
import { clientErrorReportSchema } from '@common/validators';
import type { Resolvers } from '../../graphql/generated/resolvers-types';
import { parseInput } from '../../lib/graphql-error';
import { consumeOrThrow } from '../../lib/rate-limit';

function redactOptional(text: string | undefined): string | undefined {
  return text === undefined ? undefined : redactSensitive(text);
}

export const clientErrorResolvers: Resolvers = {
  Mutation: {
    reportClientError: async (_parent, { input }, context) => {
      await consumeOrThrow(context.limiters.auth, context.clientIp);
      const report = parseInput(clientErrorReportSchema, { ...input, platform: context.platform });
      const user = await context.getCurrentUser();
      // Clients redact before sending; redacting again means a faulty client cannot leak into logs.
      context.logger.error({
        event: 'client.error',
        userId: user?.id ?? null,
        report: {
          ...report,
          message: redactSensitive(report.message),
          stack: redactOptional(report.stack),
          componentStack: redactOptional(report.componentStack),
        },
      });
      return true;
    },
  },
};
