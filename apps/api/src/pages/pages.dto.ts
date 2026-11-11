import { pageSchema } from '@moonlight/schemas';
import { createZodDto } from 'nestjs-zod';

export class PageContentDto extends createZodDto(pageSchema) {}
