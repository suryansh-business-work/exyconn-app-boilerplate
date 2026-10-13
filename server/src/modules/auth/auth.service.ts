import { randomBytes } from 'node:crypto';
import { mongo } from 'mongoose';
import { ERROR_CODES } from '@common/error-handling';
import { loginSchema, registerSchema } from '@common/validators';
import type { Env } from '../../config/env';
import { graphqlError, parseInput } from '../../lib/graphql-error';
import type { Logger } from '../../lib/logger';
import { hashPassword, verifyPassword } from '../../lib/password';
import { createRefreshToken, hashRefreshToken, signAccessToken } from '../../lib/tokens';
import { SessionModel, USER_AGENT_MAX_LENGTH } from './session.model';
import { USER_STATUS, UserModel, type UserDocument } from './user.model';

const DAY_MS = 24 * 60 * 60 * 1000;
const DUPLICATE_KEY_CODE = 11_000;

export interface SessionMeta {
  userAgent?: string;
}

export interface IssuedSession {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: UserDocument;
}

interface AuthServiceDeps {
  env: Pick<Env, 'JWT_ACCESS_SECRET' | 'ACCESS_TOKEN_TTL_SECONDS' | 'REFRESH_TOKEN_TTL_DAYS'>;
  logger: Logger;
}

export type AuthService = ReturnType<typeof createAuthService>;

export function createAuthService({ env, logger }: AuthServiceDeps) {
  let dummyHash: Promise<string> | undefined;

  /** Hash checked when no account exists, so response time does not reveal which emails are registered. */
  function getDummyHash(): Promise<string> {
    dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
    return dummyHash;
  }

  async function issueSession(user: UserDocument, meta: SessionMeta): Promise<IssuedSession> {
    const { token: refreshToken, tokenHash } = createRefreshToken();
    const refreshTokenExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);
    await SessionModel.create({
      userId: user._id,
      tokenHash,
      expiresAt: refreshTokenExpiresAt,
      userAgent: meta.userAgent?.slice(0, USER_AGENT_MAX_LENGTH),
    });
    const access = await signAccessToken(user.id, env);
    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      user,
    };
  }

  async function register(input: unknown, meta: SessionMeta): Promise<IssuedSession> {
    const values = parseInput(registerSchema, input);
    const passwordHash = await hashPassword(values.password);
    let user: UserDocument;
    try {
      user = await UserModel.create({ name: values.name, email: values.email, passwordHash });
    } catch (error) {
      // The unique index is the source of truth, so two simultaneous sign-ups cannot both succeed.
      if (error instanceof mongo.MongoServerError && error.code === DUPLICATE_KEY_CODE) {
        throw graphqlError(ERROR_CODES.EMAIL_TAKEN);
      }
      throw error;
    }
    logger.info({ event: 'auth.register', userId: user.id });
    return issueSession(user, meta);
  }

  async function login(input: unknown, meta: SessionMeta): Promise<IssuedSession> {
    const values = parseInput(loginSchema, input);
    const user = await UserModel.findOne({ email: values.email });
    const passwordMatches = await verifyPassword(
      values.password,
      user?.passwordHash ?? (await getDummyHash()),
    );
    if (!user || !passwordMatches || user.status !== USER_STATUS.active) {
      logger.warn({ event: 'auth.login.failed', userId: user?.id ?? null });
      throw graphqlError(ERROR_CODES.INVALID_CREDENTIALS);
    }
    logger.info({ event: 'auth.login', userId: user.id });
    return issueSession(user, meta);
  }

  /**
   * Swaps a refresh token for a new one. The old token is revoked in the same
   * atomic update that finds it, so a token can never be redeemed twice.
   */
  async function refresh(refreshToken: string | null, meta: SessionMeta): Promise<IssuedSession> {
    if (!refreshToken) {
      throw graphqlError(ERROR_CODES.UNAUTHENTICATED);
    }
    const now = new Date();
    const session = await SessionModel.findOneAndUpdate(
      { tokenHash: hashRefreshToken(refreshToken), revokedAt: null, expiresAt: { $gt: now } },
      { $set: { revokedAt: now } },
    );
    const user = session
      ? await UserModel.findOne({ _id: session.userId, status: USER_STATUS.active })
      : null;
    if (!user) {
      throw graphqlError(ERROR_CODES.UNAUTHENTICATED);
    }
    return issueSession(user, meta);
  }

  /** Revokes the session. Safe to call repeatedly or with an unknown token. */
  async function logout(refreshToken: string | null): Promise<void> {
    if (!refreshToken) {
      return;
    }
    const session = await SessionModel.findOneAndUpdate(
      { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    if (session) {
      logger.info({ event: 'auth.logout', userId: String(session.userId) });
    }
  }

  return { register, login, refresh, logout };
}
