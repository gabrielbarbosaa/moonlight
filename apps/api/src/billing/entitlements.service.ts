import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  PLANS,
  entitlementsFor,
  resolvePlan,
  type Entitlements,
  type PlanId,
} from '@sitebuilder/schemas';
import { PrismaService } from '../prisma/prisma.service';

export function planLimitError(message: string) {
  return new ForbiddenException({ code: 'PLAN_LIMIT', message });
}

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string): Promise<{ plan: PlanId; entitlements: Entitlements }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, status: true },
    });
    const plan = resolvePlan(subscription);
    return { plan, entitlements: entitlementsFor(plan) };
  }

  async assertBlocks(userId: string, count: number) {
    const { plan, entitlements } = await this.forUser(userId);
    if (count > entitlements.maxBlocks) {
      throw planLimitError(
        `O plano ${PLANS[plan].name} permite até ${entitlements.maxBlocks} blocos.`,
      );
    }
  }

  async assertBooking(userId: string) {
    const { plan, entitlements } = await this.forUser(userId);
    if (!entitlements.booking) {
      throw planLimitError(`A agenda não está disponível no plano ${PLANS[plan].name}.`);
    }
    return entitlements;
  }

  async assertBookingServices(userId: string, count: number) {
    const entitlements = await this.assertBooking(userId);
    if (count > entitlements.maxBookingServices) {
      throw planLimitError(`Seu plano permite até ${entitlements.maxBookingServices} serviços.`);
    }
  }
}
