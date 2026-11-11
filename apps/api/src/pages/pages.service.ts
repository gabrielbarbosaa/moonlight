import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CURRENT_PAGE_SCHEMA_VERSION,
  emptyPage,
  pageSchema,
  starterPage,
  type PageContent,
} from '@sitebuilder/schemas';
import { isDeepStrictEqual } from 'node:util';
import { EntitlementsService } from '../billing/entitlements.service';
import { PrismaService } from '../prisma/prisma.service';

type PageRecord = {
  draft: Prisma.JsonValue;
  published: Prisma.JsonValue | null;
  publishedAt: Date | null;
  updatedAt: Date;
};

function toJson(content: PageContent) {
  return content as unknown as Prisma.InputJsonValue;
}

function present(record: PageRecord) {
  const draft = pageSchema.safeParse(record.draft);
  const published = pageSchema.safeParse(record.published);
  return {
    draft: draft.success ? draft.data : emptyPage(),
    published: published.success ? published.data : null,
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt,
    hasUnpublishedChanges: !isDeepStrictEqual(record.draft, record.published),
  };
}

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async getMine(ownerId: string) {
    const page = await this.findOrCreatePage(ownerId);
    return present(page);
  }

  async saveDraft(ownerId: string, content: PageContent) {
    await this.entitlements.assertBlocks(ownerId, content.blocks.length);
    const page = await this.findOrCreatePage(ownerId);
    const updated = await this.prisma.page.update({
      where: { id: page.id },
      data: { draft: toJson(content), schemaVersion: CURRENT_PAGE_SCHEMA_VERSION },
    });
    return present(updated);
  }

  async publish(ownerId: string) {
    const page = await this.findOrCreatePage(ownerId);
    const draft = pageSchema.safeParse(page.draft);
    if (!draft.success) throw new BadRequestException('O rascunho atual é inválido');
    await this.entitlements.assertBlocks(ownerId, draft.data.blocks.length);

    const [updated] = await this.prisma.$transaction([
      this.prisma.page.update({
        where: { id: page.id },
        data: { published: toJson(draft.data), publishedAt: new Date() },
      }),
      this.prisma.pageVersion.create({
        data: {
          pageId: page.id,
          content: toJson(draft.data),
          schemaVersion: CURRENT_PAGE_SCHEMA_VERSION,
        },
      }),
    ]);
    return present(updated);
  }

  private async findOrCreatePage(ownerId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, page: true },
    });
    if (!tenant) throw new NotFoundException('Você ainda não criou uma página');
    if (tenant.page) return tenant.page;

    return this.prisma.page.create({
      data: {
        tenantId: tenant.id,
        draft: toJson(starterPage(tenant.name)),
        schemaVersion: CURRENT_PAGE_SCHEMA_VERSION,
      },
    });
  }
}
