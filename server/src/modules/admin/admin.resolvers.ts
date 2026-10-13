import { requireRole } from '../../graphql/context';
import type { Resolvers } from '../../graphql/generated/resolvers-types';
import { ROLES } from '@common/types';
import { UserModel } from '../auth/user.model';

export const adminResolvers: Resolvers = {
  Query: {
    adminDashboard: async (_parent, _args, context) => {
      await requireRole(context, ROLES.admin);
      // Collection metadata, not a scan, so this stays fast as the user base grows.
      return { totalUsers: await UserModel.estimatedDocumentCount() };
    },
  },
};
