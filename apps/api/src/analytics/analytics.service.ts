import { HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  pageSchema,
  type AnalyticsDay,
  type AnalyticsSummary,
  type TrackEventInput,
} from '@sitebuilder/schemas';
import { createHmac } from 'node:crypto';
import Redis from 'ioredis';
import { EntitlementsService } from '../billing/entitlements.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS } from '../redis/redis.constants';
import { RateLimitService } from '../redis/rate-limit.service';
import {
  CLICK_PREFIX,
  VIEWS_FIELD,
  countersKey,
  dayKey,
  slugCacheKey,
  visitorsKey,
} from './analytics.keys';

const BOT_PATTERN = /bot|crawl|spider|slurp|headless|preview|curl|wget|python-requests/i;
const TRACK_LIMIT_PER_MINUTE = 120;
const MAX_CLICK_FIELDS_PER_DAY = 200;
const KEY_TTL_SECONDS = 60 * 60 * 24 * 60;
const SLUG_CACHE_SECONDS = 60;
const MAX_TOP_LINKS = 10;

type DayCounters = { views: number; uniqueVisitors: number; clicks: Record<string, number> };

@Injectable()
export class AnalyticsService {
  private readonly secret: string;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
    private readonly entitlements: EntitlementsService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('SESSION_SECRET');
  }

  async track(event: TrackEventInput, ip: string, userAgent: string | undefined) {
    if (!userAgent || BOT_PATTERN.test(userAgent)) return;

    const allowed = await this.rateLimit.allow(`track:${ip}`, TRACK_LIMIT_PER_MINUTE, 60);
    if (!allowed) throw new HttpException('Muitas requisições', HttpStatus.TOO_MANY_REQUESTS);

    const tenantId = await this.resolveTenantId(event.slug);
    const day = dayKey();
    const counters = countersKey(tenantId, day);

    if (event.type === 'view') {
      const visitor = createHmac('sha256', this.secret)
        .update(`${day}:${ip}:${userAgent}`)
        .digest('base64');
      const uniques = visitorsKey(tenantId, day);
      await this.redis
        .multi()
        .hincrby(counters, VIEWS_FIELD, 1)
        .expire(counters, KEY_TTL_SECONDS)
        .pfadd(uniques, visitor)
        .expire(uniques, KEY_TTL_SECONDS)
        .exec();
      return;
    }

    if ((await this.redis.hlen(counters)) >= MAX_CLICK_FIELDS_PER_DAY) return;
    await this.redis
      .multi()
      .hincrby(counters, `${CLICK_PREFIX}${event.linkId}`, 1)
      .expire(counters, KEY_TTL_SECONDS)
      .exec();
  }

  async getSummary(ownerId: string, days: number): Promise<AnalyticsSummary> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, page: { select: { draft: true } } },
    });
    if (!tenant) throw new NotFoundException('Você ainda não criou uma página');

    const { entitlements } = await this.entitlements.forUser(ownerId);
    const dates = this.lastDays(Math.min(days, entitlements.analyticsDays));
    const rows = await this.prisma.analyticsDaily.findMany({
      where: { tenantId: tenant.id, date: { gte: new Date(`${dates[0]}T00:00:00.000Z`) } },
    });
    const stored = new Map(
      rows.map((row) => [
        dayKey(row.date),
        {
          views: row.views,
          uniqueVisitors: row.uniqueVisitors,
          clicks: (row.clicks ?? {}) as Record<string, number>,
        } satisfies DayCounters,
      ]),
    );

    const perDay = new Map<string, DayCounters>();
    for (const date of dates) {
      perDay.set(date, stored.get(date) ?? (await this.readLive(tenant.id, date)));
    }

    const daily: AnalyticsDay[] = [];
    const clickTotals = new Map<string, number>();
    const totals = { views: 0, uniqueVisitors: 0, clicks: 0 };

    for (const date of dates) {
      const counters = perDay.get(date)!;
      const clicks = Object.values(counters.clicks).reduce((sum, value) => sum + value, 0);
      daily.push({ date, views: counters.views, uniqueVisitors: counters.uniqueVisitors, clicks });
      totals.views += counters.views;
      totals.uniqueVisitors += counters.uniqueVisitors;
      totals.clicks += clicks;
      for (const [id, count] of Object.entries(counters.clicks)) {
        clickTotals.set(id, (clickTotals.get(id) ?? 0) + count);
      }
    }

    const labels = this.linkLabels(tenant.page?.draft);
    const topLinks = [...clickTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TOP_LINKS)
      .map(([id, clicks]) => ({ id, label: labels.get(id) ?? id, clicks }));

    return { from: dates[0], to: dates[dates.length - 1], totals, daily, topLinks };
  }

  private async resolveTenantId(slug: string): Promise<string> {
    const cached = await this.redis.get(slugCacheKey(slug));
    if (cached) return cached;

    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Página não encontrada');

    await this.redis.set(slugCacheKey(slug), tenant.id, 'EX', SLUG_CACHE_SECONDS);
    return tenant.id;
  }

  private async readLive(tenantId: string, day: string): Promise<DayCounters> {
    const [hash, uniqueVisitors] = await Promise.all([
      this.redis.hgetall(countersKey(tenantId, day)),
      this.redis.pfcount(visitorsKey(tenantId, day)),
    ]);
    const clicks: Record<string, number> = {};
    for (const [field, value] of Object.entries(hash)) {
      if (field.startsWith(CLICK_PREFIX)) clicks[field.slice(CLICK_PREFIX.length)] = Number(value);
    }
    return { views: Number(hash[VIEWS_FIELD] ?? 0), uniqueVisitors, clicks };
  }

  private lastDays(days: number): string[] {
    const today = new Date(`${dayKey()}T00:00:00.000Z`);
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() - (days - 1 - index));
      return dayKey(date);
    });
  }

  private linkLabels(draft: unknown): Map<string, string> {
    const labels = new Map<string, string>();
    const parsed = pageSchema.safeParse(draft);
    if (!parsed.success) return labels;

    for (const block of parsed.data.blocks) {
      if (block.type === 'links') {
        for (const item of block.props.items) labels.set(item.id, item.label);
      }
      if (block.type === 'hero' && block.props.ctaLabel) {
        labels.set(`cta-${block.id}`, block.props.ctaLabel);
      }
    }
    return labels;
  }
}
