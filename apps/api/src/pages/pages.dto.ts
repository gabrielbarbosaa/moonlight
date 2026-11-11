import { pageSchema } from '@sitebuilder/schemas';
import { createZodDto } from 'nestjs-zod';

export class PageContentDto extends createZodDto(pageSchema) {}
