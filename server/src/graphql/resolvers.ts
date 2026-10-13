import { adminResolvers } from '../modules/admin/admin.resolvers';
import { authResolvers } from '../modules/auth/auth.resolvers';
import { clientErrorResolvers } from '../modules/client-error/client-error.resolvers';
import { localizationResolvers } from '../modules/localization/localization.resolvers';
import type { Resolvers } from './generated/resolvers-types';

export const resolvers: Resolvers = {
  Query: {
    ...authResolvers.Query,
    ...localizationResolvers.Query,
    ...adminResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...clientErrorResolvers.Mutation,
  },
};
