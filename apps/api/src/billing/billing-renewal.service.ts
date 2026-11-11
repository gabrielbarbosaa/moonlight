import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';
import { SandboxBillingService } from './sandbox-billing.service';

@Injectable()
export class BillingRenewalService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BillingRenewalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly sandbox: SandboxBillingService,
  ) {}

  async onApplicationBootstrap() {
    await this.safeProcess();
  }

  @Cron('10 0 * * *', { timeZone: 'UTC' })
  async scheduledProcess() {
    await this.safeProcess();
  }

  async process(): Promise<number> {
    const due = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { lte: new Date() },
        providerSubscriptionId: { not: null },
      },
    });

    for (const subscription of due) {
      const type = subscription.cancelAtPeriodEnd
        ? 'subscription.canceled'
        : 'subscription.renewed';
      const signed = this.sandbox.signEvent(type, {
        providerSubscriptionId: subscription.providerSubscriptionId ?? undefined,
      });
      await this.billing.handleWebhook(signed.rawBody, signed.signature);
    }
    return due.length;
  }

  private async safeProcess() {
    try {
      const count = await this.process();
      if (count > 0) this.logger.log(`Billing: ${count} assinatura(s) processada(s)`);
    } catch (error) {
      this.logger.error(
        'Falha ao processar renovações',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
