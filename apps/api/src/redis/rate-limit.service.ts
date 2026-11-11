import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from './redis.constants';

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

@Injectable()
export class RateLimitService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const redisKey = `rl:${key}`;
    const count = await this.redis.incr(redisKey);
    let ttl = count === 1 ? -1 : await this.redis.ttl(redisKey);
    if (ttl < 0) {
      await this.redis.expire(redisKey, windowSeconds);
      ttl = windowSeconds;
    }
    return { allowed: count <= limit, retryAfterSeconds: ttl };
  }

  async allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    return (await this.consume(key, limit, windowSeconds)).allowed;
  }
}
