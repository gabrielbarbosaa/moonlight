import {
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MAX_UPLOAD_BYTES } from '@moonlight/schemas';
import type { Response } from 'express';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { SESSION_COOKIE } from '../auth/session.service';
import { LocalStorageService } from './local-storage.service';
import { MediaIdParamDto } from './media.dto';
import { MediaService } from './media.service';
import { MEDIA_KEY_PATTERN } from './storage.port';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly storage: LocalStorageService,
  ) {}

  @Post()
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({ summary: 'Envia uma imagem (JPG, PNG, WebP ou GIF, até 5 MB)' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  upload(@Req() req: AuthenticatedRequest, @UploadedFile() file: Express.Multer.File | undefined) {
    return this.media.upload(req.userId, file);
  }

  @Get()
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Biblioteca de imagens do usuário e a cota do plano' })
  list(@Req() req: AuthenticatedRequest) {
    return this.media.list(req.userId);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Apaga uma imagem que não esteja em uso' })
  async remove(@Req() req: AuthenticatedRequest, @Param() params: MediaIdParamDto) {
    await this.media.remove(req.userId, params.id);
  }

  @Get('files/:name')
  @ApiOperation({ summary: 'Entrega pública de uma imagem enviada' })
  file(@Param('name') name: string, @Res() res: Response) {
    if (!MEDIA_KEY_PATTERN.test(name)) throw new NotFoundException();

    res.set({
      'Content-Type': 'image/webp',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.sendFile(name, { root: this.storage.directory }, (error) => {
      if (error && !res.headersSent) res.status(404).end();
    });
  }
}
