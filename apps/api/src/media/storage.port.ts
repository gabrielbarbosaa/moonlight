export const MEDIA_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export abstract class StoragePort {
  abstract put(key: string, data: Buffer): Promise<void>;
  abstract remove(key: string): Promise<void>;
  abstract publicUrl(key: string): string;
}
