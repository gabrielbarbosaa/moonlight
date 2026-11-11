import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { SESSION_COOKIE } from '../auth/session.service';
import { CreateReportDto, CreateTenantDto, SlugParamDto, SlugQueryDto } from './tenants.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Post()
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Cria o tenant (página) do usuário logado' })
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateTenantDto) {
    return this.tenants.create(req.userId, body);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Lista os tenants do usuário logado' })
  listMine(@Req() req: AuthenticatedRequest) {
    return this.tenants.listMine(req.userId);
  }

  @Get('slug-available')
  @ApiOperation({ summary: 'Informa se um endereço (slug) está livre' })
  slugAvailable(@Query() query: SlugQueryDto) {
    return this.tenants.isSlugAvailable(query.slug);
  }

  @Post('public/:slug/report')
  @HttpCode(204)
  @ApiOperation({ summary: 'Denuncia uma página pública' })
  async report(@Param() params: SlugParamDto, @Body() body: CreateReportDto, @Req() req: Request) {
    await this.tenants.report(params.slug, body, req.ip ?? 'unknown');
  }

  @Get('public/:slug')
  @ApiOperation({ summary: 'Dados públicos de um tenant ativo' })
  findPublic(@Param() params: SlugParamDto) {
    return this.tenants.findPublic(params.slug);
  }
}
