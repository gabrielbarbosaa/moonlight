import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  BILLING_PERIOD_DAYS,
  PLANS,
  entitlementsFor,
  resolvePlan,
  type BillingState,
  type PlanId,
} from '@sitebuilder/schemas';
import { PrismaService } from '../prisma/prisma.service';
import { BillingPort, type BillingProviderEvent } from './billing.port';

const DAY_MS = 86_400_000;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: BillingPort,
  ) {}

  async getState(userId: string): Promise<BillingState> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    const plan = resolvePlan(subscription);
    return {
      plan,
      status: subscription ? subscription.status : 'NONE',
      entitlements: entitlementsFor(plan),
      currentPeriodEnd:
        subscription && plan !== 'FREE' ? subscription.currentPeriodEnd.toISOString() : null,
      cancelAtPeriodEnd: plan !== 'FREE' && (subscription?.cancelAtPeriodEnd ?? false),
      plans: Object.values(PLANS),
    };
  }

  async startCheckout(userId: string, plan: PlanId) {
    const state = await this.getState(userId);
    if (state.plan === plan)
      throw new ConflictException(`Você já está no plano ${PLANS[plan].name}`);
    return this.provider.createCheckout({ userId, plan });
  }

  async setCancelAtPeriodEnd(userId: string, cancel: boolean): Promise<BillingState> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new ConflictException('Você não tem uma assinatura ativa');
    }
    if (subscription.providerSubscriptionId) {
      await this.provider.setCancelAtPeriodEnd(subscription.providerSubscriptionId, cancel);
    }
    await this.prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: cancel },
    });
    return this.getState(userId);
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    const event = this.provider.verifyWebhook(rawBody, signature);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.billingEvent.create({
          data: {
            providerEventId: event.id,
            type: event.type,
            payload: event as unknown as Prisma.InputJsonValue,
          },
        });
        await this.apply(tx, event);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.log(`Evento repetido ignorado: ${event.id}`);
        return { duplicate: true };
      }
      throw error;
    }
    return { duplicate: false };
  }

  private async apply(tx: Prisma.TransactionClient, event: BillingProviderEvent) {
    const { userId, plan, providerSubscriptionId } = event.data;

    switch (event.type) {
      case 'checkout.completed': {
        if (!userId || !plan || !providerSubscriptionId) return;
        const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) return;
        const currentPeriodEnd = new Date(Date.now() + BILLING_PERIOD_DAYS * DAY_MS);
        await tx.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan,
            status: 'ACTIVE',
            currentPeriodEnd,
            cancelAtPeriodEnd: false,
            providerSubscriptionId,
          },
          update: {
            plan,
            status: 'ACTIVE',
            currentPeriodEnd,
            cancelAtPeriodEnd: false,
            providerSubscriptionId,
          },
        });
        return;
      }
      case 'subscription.renewed': {
        if (!providerSubscriptionId) return;
        const subscription = await tx.subscription.findUnique({
          where: { providerSubscriptionId },
        });
        if (!subscription || subscription.status !== 'ACTIVE') return;
        const base = Math.max(Date.now(), subscription.currentPeriodEnd.getTime());
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { currentPeriodEnd: new Date(base + BILLING_PERIOD_DAYS * DAY_MS) },
        });
        return;
      }
      case 'subscription.canceled': {
        if (!providerSubscriptionId) return;
        await tx.subscription.updateMany({
          where: { providerSubscriptionId },
          data: { status: 'CANCELED', cancelAtPeriodEnd: false },
        });
        return;
      }
      case 'payment.failed':
        return;
    }
  }
}
