import { BadRequestException } from '@nestjs/common';
import { MAX_IMAGE_DIMENSION } from '@moonlight/schemas';
import sharp from 'sharp';

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif']);
const MAX_INPUT_PIXELS = 40_000_000;
const WEBP_QUALITY = 82;

export type ProcessedImage = {
  data: Buffer;
  width: number;
  height: number;
  contentType: 'image/webp';
};

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  try {
    const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });
    const metadata = await image.metadata();
    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
      throw new Error('Formato não suportado');
    }

    const { data, info } = await image
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    return { data, width: info.width, height: info.height, contentType: 'image/webp' };
  } catch {
    throw new BadRequestException('Envie uma imagem JPG, PNG, WebP ou GIF válida.');
  }
}
