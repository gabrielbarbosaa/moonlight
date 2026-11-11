import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PLANS, type SandboxCompleteResult, type SandboxSessionInfo } from '@moonlight/schemas';
import type { Request } from 'express';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import { SESSION_COOKIE } from '../auth/session.service';
import { CheckoutDto, SandboxCompleteDto, SandboxSessionParamDto } from './billing.dto';
import { BillingService } from './billing.service';
import { SandboxBillingService } from './sandbox-billing.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly sandbox: SandboxBillingService,
  ) {}

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Plano atual, limites e catálogo de planos' })
  me(@Req() req: AuthenticatedRequest) {
    return this.billing.getState(req.userId);
  }

  @Post('checkout')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Inicia o checkout de um plano e devolve a URL de pagamento' })
  checkout(@Req() req: AuthenticatedRequest, @Body() body: CheckoutDto) {
    return this.billing.startCheckout(req.userId, body.plan);
  }

  @Post('cancel')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Cancela a renovação ao fim do período atual' })
  cancel(@Req() req: AuthenticatedRequest) {
    return this.billing.setCancelAtPeriodEnd(req.userId, true);
  }

  @Post('resume')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Desfaz o cancelamento agendado' })
  resume(@Req() req: AuthenticatedRequest) {
    return this.billing.setCancelAtPeriodEnd(req.userId, false);
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recebe eventos assinados do provedor de pagamento' })
  webhook(@Req() req: RawBodyRequest, @Headers('x-billing-signature') signature?: string) {
    if (!req.rawBody) throw new UnauthorizedException('Corpo ausente');
    return this.billing.handleWebhook(req.rawBody, signature);
  }

  @Get('sandbox/sessions/:id')
  @ApiOperation({ summary: 'Sandbox: dados de uma sessão de checkout' })
  async sandboxSession(@Param() params: SandboxSessionParamDto): Promise<SandboxSessionInfo> {
    this.ensureSandbox();
    const session = await this.sandbox.getSession(params.id);
    if (!session) throw new NotFoundException('Sessão de checkout expirada ou inválida');
    const plan = PLANS[session.plan];
    return { plan: plan.id, planName: plan.name, priceCents: plan.priceCents };
  }

  @Post('sandbox/sessions/:id/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sandbox: conclui o pagamento de teste e dispara o webhook' })
  async sandboxComplete(
    @Param() params: SandboxSessionParamDto,
    @Body() body: SandboxCompleteDto,
  ): Promise<SandboxCompleteResult> {
    this.ensureSandbox();
    const signed = await this.sandbox.completeCheckout(params.id, body.outcome);
    if (!signed) throw new NotFoundException('Sessão de checkout expirada ou inválida');
    await this.billing.handleWebhook(signed.rawBody, signed.signature);
    return { outcome: body.outcome };
  }

  private ensureSandbox() {
    const production = process.env.NODE_ENV === 'production';
    if (production && process.env.BILLING_SANDBOX_ENABLED !== 'true') throw new NotFoundException();
  }
}
