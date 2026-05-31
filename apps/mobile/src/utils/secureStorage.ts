import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const SECURE_AVAILABLE =
  typeof SecureStore.getItemAsync === 'function' &&
  typeof SecureStore.setItemAsync === 'function';

/** Tokens use SecureStore when available; falls back to AsyncStorage in Jest. */
export async function getSecureItem(key: string): Promise<string | null> {
  if (SECURE_AVAILABLE) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (SECURE_AVAILABLE) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

export async function removeSecureItem(key: string): Promise<void> {
  if (SECURE_AVAILABLE) {
    await SecureStore.deleteItemAsync(key);
  }
  await AsyncStorage.removeItem(key);
}

export const STORAGE_KEYS = {
  TOKEN: 'smartattendance_token',
  REFRESH_TOKEN: 'smartattendance_refresh_token',
  USER: 'smartattendance_user',
} as const;
