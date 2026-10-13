import * as SecureStore from 'expo-secure-store';
import type { TokenStore } from '@common/auth';

const REFRESH_TOKEN_KEY = 'auth.refreshToken';

/** Keeps the refresh token in the device keychain (iOS) or keystore-backed storage (Android). */
export const secureTokenStore: TokenStore = {
  get: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  set: (token) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
};
