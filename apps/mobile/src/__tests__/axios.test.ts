// moduleNameMapper in package.json already redirects @react-native-async-storage/async-storage
// to src/__mocks__/async-storage.ts, so no manual jest.mock() needed for it.

jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    emit: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('../constants/api', () => ({
  API_URL: 'http://localhost:3000',
}));

import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MockAdapter from 'axios-mock-adapter';
import api, { AUTH_EXPIRED_EVENT } from '../libs/axios';

const mock = new MockAdapter(api);

beforeEach(() => {
  mock.reset();
  (AsyncStorage as any)._reset();
  jest.clearAllMocks();
});

describe('axios request interceptor', () => {
  it('attaches Authorization header when token exists in storage', async () => {
    await AsyncStorage.setItem('smartattendance_token', 'test-token-123');
    mock.onGet('/test').reply(200, { ok: true });

    const response = await api.get('/test');

    expect(response.config.headers?.Authorization).toBe('Bearer test-token-123');
  });

  it('does not attach Authorization header when no token in storage', async () => {
    mock.onGet('/test').reply(200, { ok: true });

    const response = await api.get('/test');

    expect(response.config.headers?.Authorization).toBeUndefined();
  });
});

describe('axios response interceptor — 401 handling', () => {
  it('clears storage and emits AUTH_EXPIRED_EVENT on 401', async () => {
    await AsyncStorage.setItem('smartattendance_token', 'expired-token');
    await AsyncStorage.setItem('smartattendance_user', JSON.stringify({ id: 1 }));
    mock.onGet('/api/protected').reply(401);

    await expect(api.get('/api/protected')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('smartattendance_token');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('smartattendance_user');
    expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(AUTH_EXPIRED_EVENT);
  });

  it('does NOT emit AUTH_EXPIRED_EVENT for 401 on /auth/login', async () => {
    mock.onPost('/auth/login').reply(401, { message: 'Invalid credentials' });

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(DeviceEventEmitter.emit).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it('passes through 500 errors without emitting event', async () => {
    mock.onGet('/api/data').reply(500, { message: 'Internal server error' });

    await expect(api.get('/api/data')).rejects.toMatchObject({
      response: { status: 500 },
    });

    expect(DeviceEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('passes through 403 errors without clearing storage', async () => {
    await AsyncStorage.setItem('smartattendance_token', 'valid-token');
    mock.onGet('/api/admin').reply(403);

    await expect(api.get('/api/admin')).rejects.toMatchObject({
      response: { status: 403 },
    });

    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    expect(DeviceEventEmitter.emit).not.toHaveBeenCalled();
  });
});
