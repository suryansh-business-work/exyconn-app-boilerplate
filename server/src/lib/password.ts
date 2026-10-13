import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const ALGORITHM = 'scrypt';
const SALT_BYTES = 16;
const KEY_BYTES = 64;
// OWASP-recommended scrypt work factors (N=2^15, r=8, p=3).
const DEFAULT_PARAMS = { N: 32_768, r: 8, p: 3 } as const;
const MAX_MEMORY_BYTES = 128 * 1024 * 1024;
// Upper bound on the cost accepted from a stored hash, so a corrupted record cannot stall the server.
const MAX_COST = 2 ** 20;

function deriveKey(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_BYTES, { ...options, maxmem: MAX_MEMORY_BYTES }, (error, key) => {
      if (error) {
        reject(error);
      } else {
        resolve(key);
      }
    });
  });
}

/** Hashes a password into `scrypt$N$r$p$salt$key`, so the work factors can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt, DEFAULT_PARAMS);
  const { N, r, p } = DEFAULT_PARAMS;
  return [ALGORITHM, N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
}

/** Checks a password against a stored hash in constant time. Malformed hashes never match. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelization, saltText, keyText] = storedHash.split('$');
  const N = Number(cost);
  const r = Number(blockSize);
  const p = Number(parallelization);
  const validParams = [N, r, p].every((value) => Number.isInteger(value) && value > 0);
  if (algorithm !== ALGORITHM || !validParams || N > MAX_COST || !saltText || !keyText) {
    return false;
  }
  const expected = Buffer.from(keyText, 'base64');
  if (expected.length !== KEY_BYTES) {
    return false;
  }
  const actual = await deriveKey(password, Buffer.from(saltText, 'base64'), { N, r, p });
  return timingSafeEqual(actual, expected);
}
