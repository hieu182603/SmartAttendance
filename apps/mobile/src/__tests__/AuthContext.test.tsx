import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

const mockCallbacks: Record<string, () => void> = {};

jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    emit: jest.fn(),
    addListener: jest.fn((event: string, cb: () => void) => {
      mockCallbacks[event] = cb;
      return { remove: jest.fn() };
    }),
  },
}));

const mockUser = { id: '1', name: 'Test User', email: 'test@example.com', role: 'employee' as const };
const mockToken = 'mock-jwt-token';

jest.mock('../libs/axios', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
  AUTH_EXPIRED_EVENT: 'auth:session_expired',
}));

jest.mock('../constants/api', () => ({
  AUTH_endpoints: { LOGIN: '/auth/login', ME: '/auth/me' },
}));

import api from '../libs/axios';
import { AuthProvider, useAuth } from '../context/AuthContext';
import {
  setSecureItem,
  removeSecureItem,
  getSecureItem,
  STORAGE_KEYS,
} from '../utils/secureStorage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(async () => {
  await removeSecureItem(STORAGE_KEYS.TOKEN);
  await removeSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
  await removeSecureItem(STORAGE_KEYS.USER);
  jest.clearAllMocks();
  (api.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });
});

describe('AuthContext — initial load', () => {
  it('starts loading then resolves with empty state when storage is empty', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('restores user from storage on mount and refreshes from server', async () => {
    await setSecureItem(STORAGE_KEYS.TOKEN, mockToken);
    await setSecureItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
    (api.get as jest.Mock).mockResolvedValue({ data: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.token).toBe(mockToken);
    expect(result.current.user).toMatchObject({ email: mockUser.email });
  });

  it('clears orphaned token (token without user data) on mount', async () => {
    await setSecureItem(STORAGE_KEYS.TOKEN, mockToken);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(await getSecureItem(STORAGE_KEYS.TOKEN)).toBeNull();
  });

  it('clears state when stored token is invalid (401 from /auth/me)', async () => {
    await setSecureItem(STORAGE_KEYS.TOKEN, 'stale-token');
    await setSecureItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 401 } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('keeps cached user on non-401 network error from /auth/me', async () => {
    await setSecureItem(STORAGE_KEYS.TOKEN, mockToken);
    await setSecureItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
    (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.token).toBe(mockToken);
    expect(result.current.user).toMatchObject({ email: mockUser.email });
  });
});

describe('AuthContext — login', () => {
  it('sets user and token on successful login', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { user: mockUser, token: mockToken, refreshToken: 'refresh-1' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.user).toMatchObject({ email: mockUser.email });
    expect(result.current.token).toBe(mockToken);
    expect(result.current.error).toBeNull();
  });

  it('persists token, refresh token, and user to secure storage', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { user: mockUser, token: mockToken, refreshToken: 'refresh-1' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(await getSecureItem(STORAGE_KEYS.TOKEN)).toBe(mockToken);
    expect(await getSecureItem(STORAGE_KEYS.REFRESH_TOKEN)).toBe('refresh-1');
  });

  it('sets error state and throws on failed login', async () => {
    const errorMsg = 'Invalid credentials';
    (api.post as jest.Mock).mockRejectedValue({ response: { data: { message: errorMsg } } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.login('wrong@example.com', 'bad')).rejects.toThrow(errorMsg);
    });

    expect(result.current.error).toBe(errorMsg);
    expect(result.current.user).toBeNull();
  });
});

describe('AuthContext — logout', () => {
  it('clears user, token, and storage on logout', async () => {
    (api.post as jest.Mock)
      .mockResolvedValueOnce({ data: { user: mockUser, token: mockToken, refreshToken: 'r1' } })
      .mockResolvedValueOnce({});

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    expect(result.current.token).toBe(mockToken);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(await getSecureItem(STORAGE_KEYS.TOKEN)).toBeNull();
  });
});

describe('AuthContext — AUTH_EXPIRED_EVENT', () => {
  it('clears user and token when session-expired event fires', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { user: mockUser, token: mockToken, refreshToken: 'r1' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    expect(result.current.token).toBe(mockToken);

    act(() => {
      mockCallbacks['auth:session_expired']?.();
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });
  });
});
