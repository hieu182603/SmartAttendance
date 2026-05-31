jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    emit: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('../constants/api', () => ({
  API_URL: 'http://localhost:3000',
  AUTH_endpoints: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
  },
}));

import { DeviceEventEmitter } from 'react-native';
import MockAdapter from 'axios-mock-adapter';
import api, { AUTH_EXPIRED_EVENT } from '../libs/axios';
import { setSecureItem, removeSecureItem, STORAGE_KEYS } from '../utils/secureStorage';

const mock = new MockAdapter(api);

beforeEach(async () => {
  mock.reset();
  await removeSecureItem(STORAGE_KEYS.TOKEN);
  await removeSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
  await removeSecureItem(STORAGE_KEYS.USER);
  jest.clearAllMocks();
});

describe('axios request interceptor', () => {
  it('attaches Authorization header when token exists in storage', async () => {
    await setSecureItem(STORAGE_KEYS.TOKEN, 'test-token-123');
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
  it('clears storage and emits AUTH_EXPIRED_EVENT when refresh fails', async () => {
    await setSecureItem(STORAGE_KEYS.TOKEN, 'expired-token');
    await setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, 'bad-refresh');
    await setSecureItem(STORAGE_KEYS.USER, JSON.stringify({ id: 1 }));
    mock.onGet('/api/protected').reply(401);
    mock.onPost('/auth/refresh').reply(401, {}, { 'X-Skip-Auth-Refresh': '1' });

    await expect(api.get('/api/protected')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(AUTH_EXPIRED_EVENT);
  });

  it('does NOT emit AUTH_EXPIRED_EVENT for 401 on /auth/login', async () => {
    mock.onPost('/auth/login').reply(401, { message: 'Invalid credentials' });

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(DeviceEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('refreshes token on 401 when refresh succeeds', async () => {
    await setSecureItem(STORAGE_KEYS.TOKEN, 'expired-token');
    await setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, 'valid-refresh');
    mock.onGet('/api/protected').replyOnce(401).onGet('/api/protected').reply(200, { ok: true });
    mock
      .onPost('/auth/refresh', { refreshToken: 'valid-refresh' })
      .reply(200, {
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

    const response = await api.get('/api/protected');

    expect(response.data).toEqual({ ok: true });
    expect(response.config.headers?.Authorization).toBe('Bearer new-access-token');
  });
});
