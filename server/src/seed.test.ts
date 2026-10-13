import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOCALE, fallbackMessages } from '@common/localization';
import { connectDatabase, disconnectDatabase } from './db';
import { verifyPassword } from './lib/password';
import { UserModel } from './modules/auth/user.model';
import { TranslationModel } from './modules/localization/translation.model';
import { seedAdmin, seedTranslations } from './seed';
import { captureLogger } from './test/harness';

const adminEnv = {
  SEED_ADMIN_NAME: 'First Admin',
  SEED_ADMIN_EMAIL: 'admin@example.com',
  SEED_ADMIN_PASSWORD: 'Adm1nPassword',
};

let mongo: MongoMemoryServer;
const { logger, logs } = captureLogger();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri(), logger);
});

afterAll(async () => {
  await disconnectDatabase();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
  logs.length = 0;
  vi.restoreAllMocks();
});

describe('seedAdmin', () => {
  it('creates an admin who can sign in with the configured password', async () => {
    expect(await seedAdmin(adminEnv, logger)).toBe(true);
    const admin = await UserModel.findOne({ email: adminEnv.SEED_ADMIN_EMAIL });
    expect(admin).toMatchObject({ name: 'First Admin', status: 'active' });
    expect(admin?.roles).toEqual(['admin', 'user']);
    expect(await verifyPassword(adminEnv.SEED_ADMIN_PASSWORD, admin?.passwordHash ?? '')).toBe(
      true,
    );
    expect(JSON.stringify(logs)).not.toContain(adminEnv.SEED_ADMIN_PASSWORD);
  });

  it.each(['SEED_ADMIN_NAME', 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'] as const)(
    'skips seeding when %s is not configured',
    async (missing) => {
      expect(await seedAdmin({ ...adminEnv, [missing]: undefined }, logger)).toBe(false);
      expect(await UserModel.countDocuments()).toBe(0);
      expect(logs).toContainEqual(expect.objectContaining({ event: 'seed.admin.skipped' }));
    },
  );

  it('does nothing on later runs and never resets a changed password', async () => {
    await seedAdmin(adminEnv, logger);
    const before = await UserModel.findOne({ email: adminEnv.SEED_ADMIN_EMAIL }).lean();

    expect(await seedAdmin({ ...adminEnv, SEED_ADMIN_PASSWORD: 'An0therPassword' }, logger)).toBe(
      false,
    );
    const after = await UserModel.findOne({ email: adminEnv.SEED_ADMIN_EMAIL }).lean();
    expect(after?.passwordHash).toBe(before?.passwordHash);
    expect(await UserModel.countDocuments()).toBe(1);
  });

  it('creates exactly one admin when two instances start together', async () => {
    const results = await Promise.all([seedAdmin(adminEnv, logger), seedAdmin(adminEnv, logger)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await UserModel.countDocuments()).toBe(1);
  });

  it('surfaces database failures instead of hiding them', async () => {
    vi.spyOn(UserModel, 'create').mockRejectedValue(new Error('write failed'));
    await expect(seedAdmin(adminEnv, logger)).rejects.toThrow('write failed');
  });
});

describe('seedTranslations', () => {
  const total = Object.keys(fallbackMessages).length;

  it('adds every bundled message on first run and nothing on the second', async () => {
    expect(await seedTranslations(logger)).toBe(total);
    expect(await seedTranslations(logger)).toBe(0);
    expect(await TranslationModel.countDocuments({ locale: DEFAULT_LOCALE })).toBe(total);
  });

  it('keeps text that was edited on the server and adds only what is missing', async () => {
    await TranslationModel.create({
      locale: DEFAULT_LOCALE,
      key: 'auth.login.submit',
      value: 'Edited on the server',
    });

    expect(await seedTranslations(logger)).toBe(total - 1);
    const edited = await TranslationModel.findOne({ key: 'auth.login.submit' }).lean();
    expect(edited?.value).toBe('Edited on the server');
  });
});
