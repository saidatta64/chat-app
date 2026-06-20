import { createClient, type RedisClientType } from 'redis';

const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'chat-app';

let client: RedisClientType | null = null;
let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;
let redisReady = false;
let redisConfigured = false;

function buildRedisUrl(): string | null {
  const direct = (process.env.REDIS_URL || '').trim();
  if (direct) return direct;

  const host = (process.env.REDIS_HOST || '').trim();
  if (!host) return null;

  const port = (process.env.REDIS_PORT || '6379').trim();
  const username = (process.env.REDIS_USERNAME || '').trim();
  const password = (process.env.REDIS_PASSWORD || '').trim();
  const useTls = process.env.REDIS_TLS === 'true';

  const auth =
    username && password
      ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
      : password
        ? `:${encodeURIComponent(password)}@`
        : '';

  const scheme = useTls ? 'rediss' : 'redis';
  return `${scheme}://${auth}${host}:${port}`;
}

function createConfiguredClient(): RedisClientType | null {
  const url = buildRedisUrl();
  if (!url) return null;

  return createClient({
    url,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });
}

export function isRedisConfigured(): boolean {
  return redisConfigured;
}

export function isRedisReady(): boolean {
  return redisReady;
}

export function getRedisClient(): RedisClientType | null {
  return redisReady ? client : null;
}

export function getRedisPubSubClients(): {
  pub: RedisClientType;
  sub: RedisClientType;
} | null {
  if (!redisReady || !pubClient || !subClient) return null;
  return { pub: pubClient, sub: subClient };
}

export function redisKey(...parts: string[]): string {
  return [KEY_PREFIX, ...parts].join(':');
}

export async function connectRedis(): Promise<void> {
  const url = buildRedisUrl();
  if (!url) {
    console.warn(
      'Redis not configured (set REDIS_URL or REDIS_HOST). Using in-memory fallbacks.',
    );
    return;
  }

  redisConfigured = true;
  client = createConfiguredClient()!;
  pubClient = createConfiguredClient()!;
  subClient = createConfiguredClient()!;

  const attachErrorHandler = (label: string, c: RedisClientType) => {
    c.on('error', (err) => {
      console.error(`Redis ${label} error:`, err.message);
    });
  };

  attachErrorHandler('client', client);
  attachErrorHandler('pub', pubClient);
  attachErrorHandler('sub', subClient);

  try {
    await Promise.all([client.connect(), pubClient.connect(), subClient.connect()]);
    redisReady = true;
    console.log('Redis connected successfully');
  } catch (error: any) {
    redisReady = false;
    console.error('Redis connection error:', error.message);
    console.warn('Continuing without Redis — in-memory fallbacks enabled.');
    await disconnectRedis();
  }
}

export async function disconnectRedis(): Promise<void> {
  const closers: Promise<void>[] = [];

  for (const c of [client, pubClient, subClient]) {
    if (c?.isOpen) {
      closers.push(c.quit().then(() => undefined).catch(() => undefined));
    }
  }

  await Promise.all(closers);
  client = null;
  pubClient = null;
  subClient = null;
  redisReady = false;
}
