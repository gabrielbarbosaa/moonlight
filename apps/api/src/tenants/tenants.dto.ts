import { createTenantSchema, slugSchema } from '@sitebuilder/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CreateTenantDto extends createZodDto(createTenantSchema) {}
export class SlugQueryDto extends createZodDto(z.object({ slug: slugSchema })) {}
export class SlugParamDto extends createZodDto(z.object({ slug: slugSchema })) {}
