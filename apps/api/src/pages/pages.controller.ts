import { Body, Controller, Get, HttpCode, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { SESSION_COOKIE } from '../auth/session.service';
import { PageContentDto } from './pages.dto';
import { PagesService } from './pages.service';

@ApiTags('pages')
@ApiCookieAuth(SESSION_COOKIE)
@UseGuards(SessionGuard)
@Controller('pages/me')
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  @ApiOperation({ summary: 'Rascunho e versão publicada da página do usuário' })
  get(@Req() req: AuthenticatedRequest) {
    return this.pages.getMine(req.userId);
  }

  @Put('draft')
  @ApiOperation({ summary: 'Salva o rascunho da página' })
  saveDraft(@Req() req: AuthenticatedRequest, @Body() body: PageContentDto) {
    return this.pages.saveDraft(req.userId, body);
  }

  @Post('publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publica o rascunho atual e registra uma versão' })
  publish(@Req() req: AuthenticatedRequest) {
    return this.pages.publish(req.userId);
  }
}
