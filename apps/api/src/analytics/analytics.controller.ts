import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { SESSION_COOKIE } from '../auth/session.service';
import { AnalyticsQueryDto, TrackEventDto } from './analytics.dto';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('track')
  @HttpCode(204)
  @ApiOperation({ summary: 'Registra uma visita ou um clique em uma página pública' })
  async track(@Body() body: TrackEventDto, @Req() req: Request) {
    await this.analytics.track(body, req.ip ?? 'unknown', req.headers['user-agent']);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Resumo de visitas e cliques da página do usuário' })
  summary(@Req() req: AuthenticatedRequest, @Query() query: AnalyticsQueryDto) {
    return this.analytics.getSummary(req.userId, query.days);
  }
}
