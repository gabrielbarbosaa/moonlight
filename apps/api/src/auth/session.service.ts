import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';

export const SESSION_COOKIE = 'sb_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

@Injectable()
export class SessionService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.redis.set(this.key(token), userId, 'EX', SESSION_TTL_SECONDS);
    return token;
  }

  resolve(token: string): Promise<string | null> {
    return this.redis.get(this.key(token));
  }

  async destroy(token: string): Promise<void> {
    await this.redis.del(this.key(token));
  }

  private key(token: string) {
    return `session:${createHash('sha256').update(token).digest('hex')}`;
  }
}
