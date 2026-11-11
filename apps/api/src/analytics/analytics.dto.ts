import { analyticsQuerySchema, trackEventSchema } from '@sitebuilder/schemas';
import { createZodDto } from 'nestjs-zod';

export class TrackEventDto extends createZodDto(trackEventSchema) {}
export class AnalyticsQueryDto extends createZodDto(analyticsQuerySchema) {}
