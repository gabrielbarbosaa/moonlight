export const dayKey = (date: Date = new Date()) => date.toISOString().slice(0, 10);

export const countersKey = (tenantId: string, day: string) => `an:d:${tenantId}:${day}`;
export const visitorsKey = (tenantId: string, day: string) => `an:u:${tenantId}:${day}`;
export const slugCacheKey = (slug: string) => `an:slug:${slug}`;

export const VIEWS_FIELD = 'views';
export const CLICK_PREFIX = 'c:';
