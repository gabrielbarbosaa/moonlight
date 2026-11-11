import {
  checkoutSchema,
  sandboxCompleteSchema,
  sandboxSessionParamSchema,
} from '@sitebuilder/schemas';
import { createZodDto } from 'nestjs-zod';

export class CheckoutDto extends createZodDto(checkoutSchema) {}
export class SandboxCompleteDto extends createZodDto(sandboxCompleteSchema) {}
export class SandboxSessionParamDto extends createZodDto(sandboxSessionParamSchema) {}
