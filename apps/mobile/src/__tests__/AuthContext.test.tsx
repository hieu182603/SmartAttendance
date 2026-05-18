import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// mockCallbacks stores addListener callbacks (prefixed "mock" so jest allows it in factory scope)
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
import AsyncStorage from '@react-native-async-storage/async-storage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
  (AsyncStorage as any)._reset();
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
    await AsyncStorage.setItem('smartattendance_token', mockToken);
    await AsyncStorage.setItem('smartattendance_user', JSON.stringify(mockUser));
    (api.get as jest.Mock).mockResolvedValue({ data: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.token).toBe(mockToken);
    expect(result.current.user).toMatchObject({ email: mockUser.email });
  });

  it('clears orphaned token (token without user data) on mount', async () => {
    await AsyncStorage.setItem('smartattendance_token', mockToken);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('smartattendance_token');
  });

  it('clears state when stored token is invalid (401 from /auth/me)', async () => {
    await AsyncStorage.setItem('smartattendance_token', 'stale-token');
    await AsyncStorage.setItem('smartattendance_user', JSON.stringify(mockUser));
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 401 } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('smartattendance_token');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('smartattendance_user');
  });

  it('keeps cached user on non-401 network error from /auth/me', async () => {
    await AsyncStorage.setItem('smartattendance_token', mockToken);
    await AsyncStorage.setItem('smartattendance_user', JSON.stringify(mockUser));
    (api.get as jest.Mock).mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.token).toBe(mockToken);
    expect(result.current.user).toMatchObject({ email: mockUser.email });
  });
});

describe('AuthContext — login', () => {
  it('sets user and token on successful login', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { user: mockUser, token: mockToken } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.user).toMatchObject({ email: mockUser.email });
    expect(result.current.token).toBe(mockToken);
    expect(result.current.error).toBeNull();
  });

  it('persists token and user to AsyncStorage regardless of rememberMe', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { user: mockUser, token: mockToken } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('test@example.com', 'password123', false);
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('smartattendance_token', mockToken);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('smartattendance_user', JSON.stringify(mockUser));
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

  it('derives userRole from user.role after login', async () => {
    const adminUser = { ...mockUser, role: 'admin' as const };
    (api.post as jest.Mock).mockResolvedValue({ data: { user: adminUser, token: mockToken } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('admin@example.com', 'pass');
    });

    expect(result.current.userRole).toBe('admin');
  });
});

describe('AuthContext — logout', () => {
  it('clears user, token, and AsyncStorage on logout', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { user: mockUser, token: mockToken } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.login('test@example.com', 'password'); });
    expect(result.current.token).toBe(mockToken);

    await act(async () => { await result.current.logout(); });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('smartattendance_token');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('smartattendance_user');
  });
});

describe('AuthContext — AUTH_EXPIRED_EVENT', () => {
  it('clears user and token when session-expired event fires', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { user: mockUser, token: mockToken } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.login('test@example.com', 'password'); });
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
