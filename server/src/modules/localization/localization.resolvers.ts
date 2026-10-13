import { localeSchema } from '@common/validators';
import type { Resolvers } from '../../graphql/generated/resolvers-types';
import { parseInput } from '../../lib/graphql-error';
import { TranslationModel } from './translation.model';

export const localizationResolvers: Resolvers = {
  Query: {
    translations: async (_parent, args) => {
      const locale = parseInput(localeSchema, args.locale);
      return TranslationModel.find({ locale }, { _id: 0, key: 1, value: 1 }).lean();
    },
  },
};
