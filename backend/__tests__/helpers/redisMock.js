import { jest } from "@jest/globals";

// Stateful in-memory Redis mock — stores values so refresh/logout flows work correctly.
export function createRedisMock() {
  const store = new Map();

  const redisSet = jest.fn().mockImplementation((key, value) => {
    store.set(key, value);
    return Promise.resolve("OK");
  });

  const redisGet = jest.fn().mockImplementation((key) => {
    return Promise.resolve(store.get(key) ?? null);
  });

  const redisDel = jest.fn().mockImplementation((...keys) => {
    keys.forEach((k) => store.delete(k));
    return Promise.resolve(keys.length);
  });

  const redisSAdd = jest.fn().mockResolvedValue(1);
  const redisSRem = jest.fn().mockResolvedValue(1);
  const redisSMembers = jest.fn().mockResolvedValue([]);
  const isRedisEnabled = jest.fn().mockReturnValue(false);
  const isRedisDegraded = jest.fn().mockReturnValue(false);

  const clear = () => store.clear();

  return {
    redisSet,
    redisGet,
    redisDel,
    redisSAdd,
    redisSRem,
    redisSMembers,
    isRedisEnabled,
    isRedisDegraded,
    _store: store,
    _clear: clear,
  };
}
