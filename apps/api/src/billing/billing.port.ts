import type { PlanId } from '@sitebuilder/schemas';

export type BillingEventType =
  'checkout.completed' | 'payment.failed' | 'subscription.renewed' | 'subscription.canceled';

export type BillingProviderEvent = {
  id: string;
  type: BillingEventType;
  data: {
    userId?: string;
    plan?: PlanId;
    sessionId?: string;
    providerSubscriptionId?: string;
  };
};

export abstract class BillingPort {
  abstract createCheckout(input: { userId: string; plan: PlanId }): Promise<{ url: string }>;
  abstract setCancelAtPeriodEnd(providerSubscriptionId: string, cancel: boolean): Promise<void>;
  abstract verifyWebhook(rawBody: Buffer, signature: string | undefined): BillingProviderEvent;
}
