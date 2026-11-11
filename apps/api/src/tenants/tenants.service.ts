import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CURRENT_PAGE_SCHEMA_VERSION,
  pageSchema,
  starterPage,
  type CreateTenantInput,
} from '@sitebuilder/schemas';
import { PrismaService } from '../prisma/prisma.service';

const MAX_TENANTS_PER_USER = 1;

const ownerSelect = {
  id: true,
  slug: true,
  name: true,
  status: true,
  createdAt: true,
} satisfies Prisma.TenantSelect;

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, input: CreateTenantInput) {
    const owned = await this.prisma.tenant.count({ where: { ownerId } });
    if (owned >= MAX_TENANTS_PER_USER) {
      throw new ConflictException('Você já atingiu o limite de páginas da sua conta');
    }

    try {
      const starter = starterPage(input.name) as unknown as Prisma.InputJsonValue;
      return await this.prisma.tenant.create({
        data: {
          ownerId,
          slug: input.slug,
          name: input.name,
          page: {
            create: {
              draft: starter,
              published: starter,
              schemaVersion: CURRENT_PAGE_SCHEMA_VERSION,
              publishedAt: new Date(),
            },
          },
        },
        select: ownerSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Este endereço já está em uso');
      }
      throw error;
    }
  }

  listMine(ownerId: string) {
    return this.prisma.tenant.findMany({
      where: { ownerId },
      select: ownerSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async isSlugAvailable(slug: string) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
    return { slug, available: !existing };
  }

  async findPublic(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { slug: true, name: true, status: true, page: { select: { published: true } } },
    });
    if (!tenant || tenant.status !== 'ACTIVE') throw new NotFoundException('Página não encontrada');

    const parsed = pageSchema.safeParse(tenant.page?.published);
    return { slug: tenant.slug, name: tenant.name, page: parsed.success ? parsed.data : null };
  }
}
