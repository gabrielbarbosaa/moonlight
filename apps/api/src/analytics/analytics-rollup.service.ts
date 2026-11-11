import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS } from '../redis/redis.constants';
import { CLICK_PREFIX, VIEWS_FIELD, countersKey, dayKey, visitorsKey } from './analytics.keys';

@Injectable()
export class AnalyticsRollupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AnalyticsRollupService.name);

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap() {
    await this.safeRollup();
  }

  @Cron('5 0 * * *', { timeZone: 'UTC' })
  async scheduledRollup() {
    await this.safeRollup();
  }

  async rollup(): Promise<number> {
    const today = dayKey();
    let consolidated = 0;
    let cursor = '0';

    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', 'an:d:*', 'COUNT', 100);
      cursor = next;
      for (const key of keys) {
        const [, , tenantId, day] = key.split(':');
        if (!tenantId || !day || day >= today) continue;
        await this.consolidate(tenantId, day);
        consolidated += 1;
      }
    } while (cursor !== '0');

    return consolidated;
  }

  private async safeRollup() {
    try {
      const count = await this.rollup();
      if (count > 0) this.logger.log(`Analytics: ${count} dia(s) consolidado(s)`);
    } catch (error) {
      this.logger.error(
        'Falha ao consolidar analytics',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async consolidate(tenantId: string, day: string) {
    const countersRedisKey = countersKey(tenantId, day);
    const visitorsRedisKey = visitorsKey(tenantId, day);

    const [hash, uniqueVisitors] = await Promise.all([
      this.redis.hgetall(countersRedisKey),
      this.redis.pfcount(visitorsRedisKey),
    ]);

    const views = Number(hash[VIEWS_FIELD] ?? 0);
    const clicks: Record<string, number> = {};
    for (const [field, value] of Object.entries(hash)) {
      if (field.startsWith(CLICK_PREFIX)) clicks[field.slice(CLICK_PREFIX.length)] = Number(value);
    }

    const date = new Date(`${day}T00:00:00.000Z`);

    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.analyticsDaily.findUnique({
          where: { tenantId_date: { tenantId, date } },
        });

        if (!existing) {
          await tx.analyticsDaily.create({
            data: { tenantId, date, views, uniqueVisitors, clicks },
          });
          return;
        }

        const mergedClicks = { ...(existing.clicks as Record<string, number>) };
        for (const [id, count] of Object.entries(clicks)) {
          mergedClicks[id] = (mergedClicks[id] ?? 0) + count;
        }
        await tx.analyticsDaily.update({
          where: { id: existing.id },
          data: {
            views: existing.views + views,
            uniqueVisitors: Math.max(existing.uniqueVisitors, uniqueVisitors),
            clicks: mergedClicks,
          },
        });
      });
    } catch (error) {
      const tenantGone =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
      if (!tenantGone) throw error;
    }

    await this.redis.del(countersRedisKey, visitorsRedisKey);
  }
}
