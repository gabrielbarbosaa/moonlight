import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MediaAssetDto, MediaLibrary } from '@moonlight/schemas';
import { randomUUID } from 'node:crypto';
import { EntitlementsService } from '../billing/entitlements.service';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitService } from '../redis/rate-limit.service';
import { processImage } from './image-processor';
import { NsfwService } from './nsfw.service';
import { StoragePort } from './storage.port';

const UPLOADS_PER_HOUR = 40;

type AssetRow = {
  id: string;
  key: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: Date;
};

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StoragePort,
    private readonly entitlements: EntitlementsService,
    private readonly rateLimit: RateLimitService,
    private readonly nsfw: NsfwService,
  ) {}

  async upload(ownerId: string, file: Express.Multer.File | undefined): Promise<MediaAssetDto> {
    if (!file) throw new BadRequestException('Envie um arquivo no campo "file".');

    const allowed = await this.rateLimit.allow(`upload:${ownerId}`, UPLOADS_PER_HOUR, 3600);
    if (!allowed) throw new HttpException('Muitos envios', HttpStatus.TOO_MANY_REQUESTS);

    const current = await this.prisma.mediaAsset.count({ where: { ownerId } });
    await this.entitlements.assertCanAddImage(ownerId, current);

    const processed = await processImage(file.buffer);
    await this.nsfw.assertSafe(processed.data, ownerId);
    const id = randomUUID();
    const key = `${id}.webp`;

    await this.storage.put(key, processed.data);
    try {
      const asset = await this.prisma.mediaAsset.create({
        data: {
          id,
          ownerId,
          key,
          contentType: processed.contentType,
          sizeBytes: processed.data.length,
          width: processed.width,
          height: processed.height,
        },
      });
      return this.toDto(asset);
    } catch (error) {
      await this.storage.remove(key);
      throw error;
    }
  }

  async list(ownerId: string): Promise<MediaLibrary> {
    const [rows, { entitlements }] = await Promise.all([
      this.prisma.mediaAsset.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } }),
      this.entitlements.forUser(ownerId),
    ]);
    return {
      items: rows.map((row) => this.toDto(row)),
      used: rows.length,
      limit: entitlements.maxImages,
    };
  }

  async remove(ownerId: string, id: string) {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id, ownerId } });
    if (!asset) throw new NotFoundException('Imagem não encontrada');

    const pages = await this.prisma.page.findMany({
      where: { tenant: { ownerId } },
      select: { draft: true, published: true },
    });
    if (JSON.stringify(pages).includes(asset.key)) {
      throw new ConflictException(
        'Esta imagem está em uso na sua página. Remova-a do editor antes.',
      );
    }

    await this.prisma.mediaAsset.delete({ where: { id: asset.id } });
    await this.storage.remove(asset.key);
  }

  private toDto(asset: AssetRow): MediaAssetDto {
    return {
      id: asset.id,
      url: this.storage.publicUrl(asset.key),
      width: asset.width,
      height: asset.height,
      sizeBytes: asset.sizeBytes,
      createdAt: asset.createdAt.toISOString(),
    };
  }
}
