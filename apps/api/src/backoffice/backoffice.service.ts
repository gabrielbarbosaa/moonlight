import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  BackofficeAuditEntry,
  BackofficeReport,
  BackofficeStats,
  BackofficeTenant,
  ListReportsQuery,
  ListTenantsQuery,
  Paginated,
  ResolveReportInput,
} from '@sitebuilder/schemas';
import { PrismaService } from '../prisma/prisma.service';

const PAGE_SIZE = 20;
const AUDIT_LIMIT = 30;

@Injectable()
export class BackofficeService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(): Promise<BackofficeStats> {
    const [users, tenants, suspendedTenants, openReports] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.tenantReport.count({ where: { status: 'OPEN' } }),
    ]);
    return { users, tenants, suspendedTenants, openReports };
  }

  async listTenants(query: ListTenantsQuery): Promise<Paginated<BackofficeTenant>> {
    const where: Prisma.TenantWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { slug: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { owner: { email: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          owner: { select: { email: true } },
          _count: { select: { reports: { where: { status: 'OPEN' } } } },
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
        suspendedReason: row.suspendedReason,
        ownerEmail: row.owner.email,
        openReports: row._count.reports,
        createdAt: row.createdAt.toISOString(),
      })),
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
    };
  }

  async listReports(query: ListReportsQuery): Promise<Paginated<BackofficeReport>> {
    const where: Prisma.TenantReportWhereInput = { status: query.status };
    const [total, rows] = await Promise.all([
      this.prisma.tenantReport.count({ where }),
      this.prisma.tenantReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { tenant: { select: { id: true, slug: true, name: true, status: true } } },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        reason: row.reason,
        details: row.details,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        tenant: row.tenant,
      })),
      page: query.page,
      pageSize: PAGE_SIZE,
      total,
    };
  }

  async listAudit(): Promise<BackofficeAuditEntry[]> {
    const rows = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: AUDIT_LIMIT,
      include: { actor: { select: { email: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorEmail: row.actor?.email ?? null,
      targetType: row.targetType,
      targetId: row.targetId,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async suspendTenant(actorId: string, tenantId: string, reason: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.applySuspension(tx, actorId, tenantId, reason);
    });
  }

  async reactivateTenant(actorId: string, tenantId: string) {
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.updateMany({
        where: { id: tenantId },
        data: { status: 'ACTIVE', suspendedReason: null, suspendedAt: null },
      });
      if (updated.count === 0) throw new NotFoundException('Página não encontrada');
      await tx.auditLog.create({
        data: { actorId, action: 'tenant.reactivate', targetType: 'tenant', targetId: tenantId },
      });
    });
  }

  async resolveReport(actorId: string, reportId: string, input: ResolveReportInput) {
    await this.prisma.$transaction(async (tx) => {
      const report = await tx.tenantReport.findUnique({ where: { id: reportId } });
      if (!report) throw new NotFoundException('Denúncia não encontrada');

      const now = new Date();
      if (input.action === 'suspend') {
        const reason = input.note || `Denúncia: ${report.reason}`;
        await this.applySuspension(tx, actorId, report.tenantId, reason);
        await tx.tenantReport.updateMany({
          where: { tenantId: report.tenantId, status: 'OPEN' },
          data: { status: 'RESOLVED', resolvedAt: now, resolvedById: actorId },
        });
      } else {
        await tx.tenantReport.update({
          where: { id: reportId },
          data: { status: 'DISMISSED', resolvedAt: now, resolvedById: actorId },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId,
          action: `report.${input.action === 'suspend' ? 'resolve' : 'dismiss'}`,
          targetType: 'report',
          targetId: reportId,
          metadata: { tenantId: report.tenantId, note: input.note ?? null },
        },
      });
    });
  }

  private async applySuspension(
    tx: Prisma.TransactionClient,
    actorId: string,
    tenantId: string,
    reason: string,
  ) {
    const updated = await tx.tenant.updateMany({
      where: { id: tenantId },
      data: { status: 'SUSPENDED', suspendedReason: reason, suspendedAt: new Date() },
    });
    if (updated.count === 0) throw new NotFoundException('Página não encontrada');
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'tenant.suspend',
        targetType: 'tenant',
        targetId: tenantId,
        metadata: { reason },
      },
    });
  }
}
