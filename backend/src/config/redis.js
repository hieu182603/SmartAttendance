import Redis from "ioredis";

/**
 * Redis is optional. Enable by setting either:
 * - REDIS_URL (e.g. redis://127.0.0.1:6379 or rediss://... for TLS)
 * - REDIS_HOST (+ optional REDIS_PORT, REDIS_PASSWORD, REDIS_USERNAME)
 * Set REDIS_ENABLED=false to force-disable even if URL/host exist.
 */
const buildConnectionFromEnv = () => {
  const flag = process.env.REDIS_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return null;

  const url = process.env.REDIS_URL?.trim();
  if (url) return { mode: "url", url };

  const host = process.env.REDIS_HOST?.trim();
  if (!host) return null;

  const parsedPort = Number.parseInt(process.env.REDIS_PORT ?? "6379", 10);
  const port = Number.isFinite(parsedPort) ? parsedPort : 6379;
  const password = process.env.REDIS_PASSWORD?.trim() || undefined;
  const username = process.env.REDIS_USERNAME?.trim() || undefined;

  return {
    mode: "options",
    options: { host, port, username, password },
  };
};

const _connection = buildConnectionFromEnv();
const _redisConfigured = _connection !== null;

let _client = null;
let _degraded = false;

const createClient = () => {
  const baseOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 200, 3000);
    },
  };

  const client =
    _connection.mode === "url"
      ? new Redis(_connection.url, baseOptions)
      : new Redis({ ..._connection.options, ...baseOptions });

  client.on("error", (err) => {
    if (!_degraded) {
      console.warn(`[redis] degraded mode — ${err.message}`);
      _degraded = true;
    }
  });

  client.on("ready", () => {
    if (_degraded) console.info("[redis] reconnected, cache active");
    _degraded = false;
  });

  return client;
};

const getClient = () => {
  if (!_redisConfigured) return null;
  if (!_client) _client = createClient();
  return _client;
};

export const isRedisEnabled = () => _redisConfigured;

export const redisGet = async (key) => {
  if (!_redisConfigured || _degraded) return null;
  const client = getClient();
  if (!client) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const redisSet = async (key, value, ttlSeconds) => {
  if (!_redisConfigured || _degraded) return;
  const client = getClient();
  if (!client) return;
  try {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await client.set(key, payload, "EX", ttlSeconds);
    } else {
      await client.set(key, payload);
    }
  } catch {
    /* noop */
  }
};

export const redisDel = async (...keys) => {
  if (!_redisConfigured || _degraded || keys.length === 0) return;
  const client = getClient();
  if (!client) return;
  try {
    await client.del(...keys);
  } catch {
    /* noop */
  }
};

export const cacheAside = async (key, ttlSeconds, loader) => {
  const cached = await redisGet(key);
  if (cached !== null) return cached;
  const fresh = await loader();
  if (fresh !== null && fresh !== undefined) {
    await redisSet(key, fresh, ttlSeconds);
  }
  return fresh;
};

/** True when Redis was expected but connection errors occurred. */
export const isRedisDegraded = () => _redisConfigured && _degraded;

export const redisSAdd = async (key, ...members) => {
  if (!_redisConfigured || _degraded) return;
  const client = getClient();
  if (!client) return;
  try { await client.sadd(key, ...members); } catch { /* noop */ }
};

export const redisSRem = async (key, ...members) => {
  if (!_redisConfigured || _degraded) return;
  const client = getClient();
  if (!client) return;
  try { await client.srem(key, ...members); } catch { /* noop */ }
};

export const redisSMembers = async (key) => {
  if (!_redisConfigured || _degraded) return [];
  const client = getClient();
  if (!client) return [];
  try { return await client.smembers(key); } catch { return []; }
};
