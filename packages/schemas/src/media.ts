import { z } from 'zod';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 2000;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export const mediaIdParamSchema = z.object({ id: z.string().uuid() });

export type MediaAssetDto = {
  id: string;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
};

export type MediaLibrary = {
  items: MediaAssetDto[];
  used: number;
  limit: number;
};
