import { createHash } from 'crypto';
import { getRedisClient, redisKey } from '../config/redis';

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

function cacheKey(namespace: string, rawKey: string): string {
  const hash = createHash('sha256').update(rawKey).digest('hex').slice(0, 32);
  return redisKey('cache', namespace, hash);
}

export async function cacheGet<T>(namespace: string, rawKey: string): Promise<T | null> {
  const key = cacheKey(namespace, rawKey);
  const redis = getRedisClient();

  if (redis) {
    const raw = await redis.get(key);
    if (raw) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    }
  }

  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  try {
    return JSON.parse(entry.value) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  namespace: string,
  rawKey: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const key = cacheKey(namespace, rawKey);
  const serialized = JSON.stringify(value);

  const redis = getRedisClient();
  if (redis) {
    await redis.setEx(key, ttlSeconds, serialized);
  }

  memoryCache.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}
