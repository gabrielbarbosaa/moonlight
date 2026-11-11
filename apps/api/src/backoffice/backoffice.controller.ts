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
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { SESSION_COOKIE } from '../auth/session.service';
import { SuperadminGuard } from '../auth/superadmin.guard';
import {
  IdParamDto,
  ListReportsQueryDto,
  ListTenantsQueryDto,
  ResolveReportDto,
  SuspendTenantDto,
} from './backoffice.dto';
import { BackofficeService } from './backoffice.service';

@ApiTags('backoffice')
@ApiCookieAuth(SESSION_COOKIE)
@UseGuards(SessionGuard, SuperadminGuard)
@Controller('backoffice')
export class BackofficeController {
  constructor(private readonly backoffice: BackofficeService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Totais da plataforma' })
  stats() {
    return this.backoffice.stats();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Lista páginas (tenants) com busca e filtro de status' })
  listTenants(@Query() query: ListTenantsQueryDto) {
    return this.backoffice.listTenants(query);
  }

  @Post('tenants/:id/suspend')
  @HttpCode(204)
  @ApiOperation({ summary: 'Suspende uma página, com motivo' })
  async suspend(
    @Req() req: AuthenticatedRequest,
    @Param() params: IdParamDto,
    @Body() body: SuspendTenantDto,
  ) {
    await this.backoffice.suspendTenant(req.userId, params.id, body.reason);
  }

  @Post('tenants/:id/reactivate')
  @HttpCode(204)
  @ApiOperation({ summary: 'Reativa uma página suspensa' })
  async reactivate(@Req() req: AuthenticatedRequest, @Param() params: IdParamDto) {
    await this.backoffice.reactivateTenant(req.userId, params.id);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Lista denúncias por status' })
  listReports(@Query() query: ListReportsQueryDto) {
    return this.backoffice.listReports(query);
  }

  @Post('reports/:id/resolve')
  @HttpCode(204)
  @ApiOperation({ summary: 'Dispensa a denúncia ou suspende a página denunciada' })
  async resolve(
    @Req() req: AuthenticatedRequest,
    @Param() params: IdParamDto,
    @Body() body: ResolveReportDto,
  ) {
    await this.backoffice.resolveReport(req.userId, params.id, body);
  }

  @Get('audit')
  @ApiOperation({ summary: 'Últimas ações administrativas' })
  audit() {
    return this.backoffice.listAudit();
  }
}
