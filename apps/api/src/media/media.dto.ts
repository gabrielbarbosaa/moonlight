import { mediaIdParamSchema } from '@moonlight/schemas';
import { createZodDto } from 'nestjs-zod';

export class MediaIdParamDto extends createZodDto(mediaIdParamSchema) {}
