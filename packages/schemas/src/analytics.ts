import { z } from 'zod';
import { slugSchema } from './tenant';

export const linkIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

export const trackEventSchema = z
  .object({
    slug: slugSchema,
    type: z.enum(['view', 'click']),
    linkId: linkIdSchema.optional(),
  })
  .refine((event) => event.type === 'view' || event.linkId !== undefined, {
    message: 'linkId é obrigatório em cliques',
    path: ['linkId'],
  });
export type TrackEventInput = z.infer<typeof trackEventSchema>;

export const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export type AnalyticsDay = {
  date: string;
  views: number;
  uniqueVisitors: number;
  clicks: number;
};

export type AnalyticsSummary = {
  from: string;
  to: string;
  totals: { views: number; uniqueVisitors: number; clicks: number };
  daily: AnalyticsDay[];
  topLinks: { id: string; label: string; clicks: number }[];
};
