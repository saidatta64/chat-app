import { getRedisClient, redisKey } from '../config/redis';

const USERS_HASH = redisKey('online', 'users');
const SOCKETS_HASH = redisKey('online', 'sockets');

/** In-memory fallback when Redis is unavailable (single-server dev). */
const memoryUsers = new Map<string, string>();
const memorySockets = new Map<string, string>();

class OnlineUsersService {
  async setOnline(userId: string, socketId: string): Promise<void> {
    memoryUsers.set(userId, socketId);
    memorySockets.set(socketId, userId);

    const redis = getRedisClient();
    if (!redis) return;

    await redis
      .multi()
      .hSet(USERS_HASH, userId, socketId)
      .hSet(SOCKETS_HASH, socketId, userId)
      .exec();
  }

  async getSocketId(userId: string): Promise<string | undefined> {
    const redis = getRedisClient();
    if (redis) {
      const fromRedis = await redis.hGet(USERS_HASH, userId);
      if (fromRedis) return fromRedis;
    }
    return memoryUsers.get(userId);
  }

  async removeBySocketId(socketId: string): Promise<string | undefined> {
    let userId = memorySockets.get(socketId);
    if (userId) {
      memoryUsers.delete(userId);
      memorySockets.delete(socketId);
    }

    const redis = getRedisClient();
    if (redis) {
      const fromRedis = await redis.hGet(SOCKETS_HASH, socketId);
      if (fromRedis) {
        userId = fromRedis;
        await redis
          .multi()
          .hDel(SOCKETS_HASH, socketId)
          .hDel(USERS_HASH, fromRedis)
          .exec();
      }
    }

    return userId;
  }
}

export default new OnlineUsersService();
