import * as SecureStore from 'expo-secure-store';
import { secureTokenStore } from './secure-token-store';

jest.mock('expo-secure-store', () => {
  const items = new Map<string, string>();
  return {
    getItemAsync: jest.fn((key: string) => Promise.resolve(items.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      items.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      items.delete(key);
      return Promise.resolve();
    }),
  };
});

describe('secureTokenStore', () => {
  it('returns null before anything is stored', async () => {
    await expect(secureTokenStore.get()).resolves.toBeNull();
  });

  it('stores, replaces and clears the refresh token in secure storage', async () => {
    await secureTokenStore.set('refresh-1');
    await expect(secureTokenStore.get()).resolves.toBe('refresh-1');

    await secureTokenStore.set('refresh-2');
    await expect(secureTokenStore.get()).resolves.toBe('refresh-2');

    await secureTokenStore.clear();
    await expect(secureTokenStore.get()).resolves.toBeNull();
  });

  it('always uses the same storage key', async () => {
    await secureTokenStore.set('refresh-3');
    await secureTokenStore.get();
    await secureTokenStore.clear();
    const keys = [
      ...jest.mocked(SecureStore.setItemAsync).mock.calls,
      ...jest.mocked(SecureStore.getItemAsync).mock.calls,
      ...jest.mocked(SecureStore.deleteItemAsync).mock.calls,
    ].map(([key]) => key);
    expect(new Set(keys)).toEqual(new Set(['auth.refreshToken']));
  });
});
