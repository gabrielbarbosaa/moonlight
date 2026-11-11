import { z } from 'zod';

export const REPORT_REASONS = ['spam', 'phishing', 'illegal', 'abuse', 'other'] as const;
export const reportReasonSchema = z.enum(REPORT_REASONS);

export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  spam: 'Spam',
  phishing: 'Golpe ou phishing',
  illegal: 'Conteúdo ilegal',
  abuse: 'Assédio ou abuso',
  other: 'Outro motivo',
};

export const createReportSchema = z.object({
  reason: reportReasonSchema,
  details: z.string().trim().max(500).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const suspendTenantSchema = z.object({
  reason: z.string().trim().min(3, 'Informe o motivo').max(200),
});
export type SuspendTenantInput = z.infer<typeof suspendTenantSchema>;

export const resolveReportSchema = z.object({
  action: z.enum(['dismiss', 'suspend']),
  note: z.string().trim().max(200).optional(),
});
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

export const listTenantsQuerySchema = z.object({
  search: z.string().trim().max(60).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type ListTenantsQuery = z.infer<typeof listTenantsQuerySchema>;

export const listReportsQuerySchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED', 'DISMISSED']).default('OPEN'),
  page: z.coerce.number().int().min(1).default(1),
});
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;

export const tenantIdParamSchema = z.object({ id: z.string().uuid() });

export type BackofficeStats = {
  users: number;
  tenants: number;
  suspendedTenants: number;
  openReports: number;
};

export type BackofficeTenant = {
  id: string;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  suspendedReason: string | null;
  ownerEmail: string;
  openReports: number;
  createdAt: string;
};

export type BackofficeReport = {
  id: string;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  tenant: { id: string; slug: string; name: string; status: 'ACTIVE' | 'SUSPENDED' };
};

export type BackofficeAuditEntry = {
  id: string;
  action: string;
  actorEmail: string | null;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number };
