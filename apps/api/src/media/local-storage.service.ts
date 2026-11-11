import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { MEDIA_KEY_PATTERN, StoragePort } from './storage.port';

@Injectable()
export class LocalStorageService extends StoragePort implements OnModuleInit {
  readonly directory: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    super();
    this.directory = resolve(config.get<string>('MEDIA_DIR') || 'storage/media');
    const publicBase =
      config.get<string>('API_URL') || `http://localhost:${config.get('API_PORT', 4000)}`;
    this.baseUrl = publicBase.replace(/\/+$/, '');
  }

  async onModuleInit() {
    await mkdir(this.directory, { recursive: true });
  }

  async put(key: string, data: Buffer) {
    await writeFile(this.pathFor(key), data, { flag: 'wx' });
  }

  async remove(key: string) {
    await rm(this.pathFor(key), { force: true });
  }

  publicUrl(key: string) {
    return `${this.baseUrl}/media/files/${key}`;
  }

  private pathFor(key: string) {
    if (!MEDIA_KEY_PATTERN.test(key)) throw new Error('Chave de arquivo inválida');
    return join(this.directory, key);
  }
}
