import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// A single shared client is enough for cache-only usage. If Redis is
// unreachable we degrade to a no-op cache — attendance flow still works
// via DB, just slower. We never want Redis downtime to block check-in.
let _client = null;
let _degraded = false;

const createClient = () => {
  const client = new Redis(REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    // Retry with exponential backoff up to 3 seconds between attempts.
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 200, 3000);
    },
  });

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
  if (!_client) _client = createClient();
  return _client;
};

export const redisGet = async (key) => {
  if (_degraded) return null;
  try {
    const raw = await getClient().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    // Swallow cache errors — never break the request path.
    return null;
  }
};

export const redisSet = async (key, value, ttlSeconds) => {
  if (_degraded) return;
  try {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await getClient().set(key, payload, "EX", ttlSeconds);
    } else {
      await getClient().set(key, payload);
    }
  } catch (_) {
    /* noop */
  }
};

export const redisDel = async (...keys) => {
  if (_degraded || keys.length === 0) return;
  try {
    await getClient().del(...keys);
  } catch (_) {
    /* noop */
  }
};

// get-or-load helper — use for read-through caching of DB queries.
export const cacheAside = async (key, ttlSeconds, loader) => {
  const cached = await redisGet(key);
  if (cached !== null) return cached;
  const fresh = await loader();
  if (fresh !== null && fresh !== undefined) {
    await redisSet(key, fresh, ttlSeconds);
  }
  return fresh;
};

export const isRedisDegraded = () => _degraded;
