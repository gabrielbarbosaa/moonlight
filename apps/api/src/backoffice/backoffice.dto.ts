import {
  listReportsQuerySchema,
  listTenantsQuerySchema,
  resolveReportSchema,
  suspendTenantSchema,
  tenantIdParamSchema,
} from '@moonlight/schemas';
import { createZodDto } from 'nestjs-zod';

export class ListTenantsQueryDto extends createZodDto(listTenantsQuerySchema) {}
export class ListReportsQueryDto extends createZodDto(listReportsQuerySchema) {}
export class SuspendTenantDto extends createZodDto(suspendTenantSchema) {}
export class ResolveReportDto extends createZodDto(resolveReportSchema) {}
export class IdParamDto extends createZodDto(tenantIdParamSchema) {}
