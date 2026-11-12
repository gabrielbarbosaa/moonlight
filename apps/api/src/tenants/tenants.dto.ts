import { createReportSchema, createTenantSchema, slugSchema } from '@moonlight/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CreateTenantDto extends createZodDto(createTenantSchema) {}
export class CreateReportDto extends createZodDto(createReportSchema) {}
export class SlugQueryDto extends createZodDto(z.object({ slug: slugSchema })) {}
export class DomainQueryDto extends createZodDto(
  z.object({ domain: z.string().min(1).max(253) }),
) {}
export class SlugParamDto extends createZodDto(z.object({ slug: slugSchema })) {}
