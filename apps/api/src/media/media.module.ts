import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LocalStorageService } from './local-storage.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { NsfwService } from './nsfw.service';
import { StoragePort } from './storage.port';

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [
    LocalStorageService,
    { provide: StoragePort, useExisting: LocalStorageService },
    NsfwService,
    MediaService,
  ],
})
export class MediaModule {}
