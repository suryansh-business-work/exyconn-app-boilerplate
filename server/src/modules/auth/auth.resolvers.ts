import type { CookieOptions } from 'express';
import { usesSecureCookies } from '../../config/env';
import type { GraphqlContext } from '../../graphql/context';
import type { AuthPayload, Resolvers, User } from '../../graphql/generated/resolvers-types';
import { consumeOrThrow } from '../../lib/rate-limit';
import type { IssuedSession, SessionMeta } from './auth.service';
import type { UserDocument } from './user.model';

export const REFRESH_COOKIE_NAME = 'refresh_token';

function toGraphqlUser(user: UserDocument): User {
  return { id: user.id, email: user.email, name: user.name, roles: user.roles };
}

function cookieOptions(context: GraphqlContext): CookieOptions {
  return {
    httpOnly: true,
    secure: usesSecureCookies(context.env),
    sameSite: 'lax',
    // The cookie is only ever needed by the GraphQL endpoint.
    path: '/graphql',
  };
}

function sessionMeta(context: GraphqlContext): SessionMeta {
  const userAgent = context.req.get('user-agent');
  return userAgent ? { userAgent } : {};
}

/** Native apps store the refresh token themselves; browsers get it in a cookie scripts cannot read. */
function deliverSession(context: GraphqlContext, session: IssuedSession): AuthPayload {
  const isNative = context.platform === 'native';
  if (!isNative) {
    context.res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, {
      ...cookieOptions(context),
      expires: session.refreshTokenExpiresAt,
    });
  }
  return {
    accessToken: session.accessToken,
    accessTokenExpiresAt: session.accessTokenExpiresAt.toISOString(),
    refreshToken: isNative ? session.refreshToken : null,
    user: toGraphqlUser(session.user),
  };
}

function readRefreshToken(context: GraphqlContext, argument?: string | null): string | null {
  if (argument) {
    return argument;
  }
  const cookies: Record<string, unknown> = context.req.cookies ?? {};
  const cookie = cookies[REFRESH_COOKIE_NAME];
  return typeof cookie === 'string' && cookie ? cookie : null;
}

export const authResolvers: Resolvers = {
  Query: {
    me: async (_parent, _args, context) => {
      const user = await context.getCurrentUser();
      return user ? toGraphqlUser(user) : null;
    },
  },
  Mutation: {
    register: async (_parent, { input }, context) => {
      await consumeOrThrow(context.limiters.auth, context.clientIp);
      return deliverSession(context, await context.auth.register(input, sessionMeta(context)));
    },
    login: async (_parent, { input }, context) => {
      await consumeOrThrow(context.limiters.auth, context.clientIp);
      return deliverSession(context, await context.auth.login(input, sessionMeta(context)));
    },
    refreshSession: async (_parent, { refreshToken }, context) => {
      await consumeOrThrow(context.limiters.auth, context.clientIp);
      try {
        const token = readRefreshToken(context, refreshToken);
        return deliverSession(context, await context.auth.refresh(token, sessionMeta(context)));
      } catch (error) {
        // A dead cookie would otherwise be sent, and rejected, on every page load.
        context.res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(context));
        throw error;
      }
    },
    logout: async (_parent, { refreshToken }, context) => {
      await context.auth.logout(readRefreshToken(context, refreshToken));
      context.res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(context));
      return true;
    },
  },
};
