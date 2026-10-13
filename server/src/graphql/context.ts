import type { ExpressContextFunctionArgument } from '@as-integrations/express5';
import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { ERROR_CODES } from '@common/error-handling';
import { CLIENT_PLATFORM_HEADER, type ClientPlatform, type Role } from '@common/types';
import type { Env } from '../config/env';
import { graphqlError } from '../lib/graphql-error';
import type { Logger } from '../lib/logger';
import type { RateLimiters } from '../lib/rate-limit';
import { verifyAccessToken } from '../lib/tokens';
import type { AuthService } from '../modules/auth/auth.service';
import { USER_STATUS, UserModel, type UserDocument } from '../modules/auth/user.model';

const BEARER_PREFIX = 'Bearer ';

export interface ContextDeps {
  env: Env;
  logger: Logger;
  auth: AuthService;
  limiters: RateLimiters;
}

export interface GraphqlContext extends ContextDeps {
  req: Request;
  res: Response;
  platform: ClientPlatform;
  clientIp: string;
  /** Loads the signed-in user at most once per request. */
  getCurrentUser: () => Promise<UserDocument | null>;
}

async function loadCurrentUser(req: Request, env: Env): Promise<UserDocument | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith(BEARER_PREFIX)) {
    return null;
  }
  const userId = await verifyAccessToken(header.slice(BEARER_PREFIX.length), env);
  if (!userId || !isValidObjectId(userId)) {
    return null;
  }
  // Read from the database on every request so disabling a user or changing roles takes effect at once.
  return UserModel.findOne({ _id: userId, status: USER_STATUS.active });
}

export function createContextFactory(deps: ContextDeps) {
  return async ({ req, res }: ExpressContextFunctionArgument): Promise<GraphqlContext> => {
    let currentUser: Promise<UserDocument | null> | undefined;
    return {
      ...deps,
      req,
      res,
      platform: req.get(CLIENT_PLATFORM_HEADER) === 'native' ? 'native' : 'web',
      clientIp: req.ip ?? 'unknown',
      getCurrentUser: () => {
        currentUser ??= loadCurrentUser(req, deps.env);
        return currentUser;
      },
    };
  };
}

export async function requireUser(context: GraphqlContext): Promise<UserDocument> {
  const user = await context.getCurrentUser();
  if (!user) {
    throw graphqlError(ERROR_CODES.UNAUTHENTICATED);
  }
  return user;
}

export async function requireRole(context: GraphqlContext, role: Role): Promise<UserDocument> {
  const user = await requireUser(context);
  if (!user.roles.includes(role)) {
    context.logger.warn({ event: 'auth.forbidden', userId: user.id, requiredRole: role });
    throw graphqlError(ERROR_CODES.FORBIDDEN);
  }
  return user;
}
