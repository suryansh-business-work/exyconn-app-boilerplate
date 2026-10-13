import { createHash, randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import type { Env } from '../config/env';

const JWT_ALGORITHM = 'HS256';
const REFRESH_TOKEN_BYTES = 48;

type TokenEnv = Pick<Env, 'JWT_ACCESS_SECRET' | 'ACCESS_TOKEN_TTL_SECONDS'>;

function secretKey(env: TokenEnv): Uint8Array {
  return new TextEncoder().encode(env.JWT_ACCESS_SECRET);
}

export interface SignedAccessToken {
  token: string;
  expiresAt: Date;
}

/** Short-lived token that only identifies the user; roles are always read from the database. */
export async function signAccessToken(
  userId: string,
  env: TokenEnv,
  now: Date = new Date(),
): Promise<SignedAccessToken> {
  const issuedAtSeconds = Math.floor(now.getTime() / 1000);
  const expiresAtSeconds = issuedAtSeconds + env.ACCESS_TOKEN_TTL_SECONDS;
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(userId)
    .setIssuedAt(issuedAtSeconds)
    .setExpirationTime(expiresAtSeconds)
    .sign(secretKey(env));
  return { token, expiresAt: new Date(expiresAtSeconds * 1000) };
}

/** Returns the user id for a valid token, or null when it is missing, forged, malformed or expired. */
export async function verifyAccessToken(token: string, env: TokenEnv): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(env), { algorithms: [JWT_ALGORITHM] });
    return payload.sub ?? null;
  } catch {
    // Every verification failure means the same thing to callers: not authenticated.
    return null;
  }
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Opaque random refresh token. Only its hash is stored, so a database leak cannot be replayed. */
export function createRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  return { token, tokenHash: hashRefreshToken(token) };
}
