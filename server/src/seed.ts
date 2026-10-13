import { mongo } from 'mongoose';
import { DEFAULT_LOCALE, fallbackMessages } from '@common/localization';
import type { Env } from './config/env';
import type { Logger } from './lib/logger';
import { hashPassword } from './lib/password';
import { ROLES } from '@common/types';
import { UserModel } from './modules/auth/user.model';
import { TranslationModel } from './modules/localization/translation.model';

const DUPLICATE_KEY_CODE = 11_000;

type SeedEnv = Pick<Env, 'SEED_ADMIN_NAME' | 'SEED_ADMIN_EMAIL' | 'SEED_ADMIN_PASSWORD'>;

/**
 * Creates the first admin from configuration. Runs on every start and never
 * touches an account that already exists, so a changed password is not reset.
 */
export async function seedAdmin(env: SeedEnv, logger: Logger): Promise<boolean> {
  const { SEED_ADMIN_NAME: name, SEED_ADMIN_EMAIL: email, SEED_ADMIN_PASSWORD: password } = env;
  if (!name || !email || !password) {
    logger.info({ event: 'seed.admin.skipped', reason: 'not configured' });
    return false;
  }
  if (await UserModel.exists({ email })) {
    return false;
  }
  try {
    const user = await UserModel.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      roles: [ROLES.admin, ROLES.user],
    });
    logger.info({ event: 'seed.admin.created', userId: user.id });
    return true;
  } catch (error) {
    // Another instance starting at the same moment created it first.
    if (error instanceof mongo.MongoServerError && error.code === DUPLICATE_KEY_CODE) {
      return false;
    }
    throw error;
  }
}

/** Adds bundled translations the server does not have yet, leaving edited values untouched. */
export async function seedTranslations(logger: Logger): Promise<number> {
  const result = await TranslationModel.bulkWrite(
    Object.entries(fallbackMessages).map(([key, value]) => ({
      updateOne: {
        filter: { locale: DEFAULT_LOCALE, key },
        update: { $setOnInsert: { value } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  logger.info({ event: 'seed.translations', added: result.upsertedCount });
  return result.upsertedCount;
}
