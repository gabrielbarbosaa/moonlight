import { z } from 'zod';

export const PLAN_IDS = ['FREE', 'PRO'] as const;
export const planIdSchema = z.enum(PLAN_IDS);
export type PlanId = z.infer<typeof planIdSchema>;

export type Entitlements = {
  maxBlocks: number;
  maxImages: number;
  booking: boolean;
  maxBookingServices: number;
  analyticsDays: number;
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceCents: number;
  entitlements: Entitlements;
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  FREE: {
    id: 'FREE',
    name: 'Grátis',
    priceCents: 0,
    entitlements: {
      maxBlocks: 8,
      maxImages: 10,
      booking: false,
      maxBookingServices: 0,
      analyticsDays: 7,
    },
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    priceCents: 2900,
    entitlements: {
      maxBlocks: 50,
      maxImages: 100,
      booking: true,
      maxBookingServices: 10,
      analyticsDays: 90,
    },
  },
};

export const BILLING_PERIOD_DAYS = 30;

export function resolvePlan(
  subscription: { plan: PlanId; status: 'ACTIVE' | 'CANCELED' } | null | undefined,
): PlanId {
  return subscription && subscription.status === 'ACTIVE' ? subscription.plan : 'FREE';
}

export function entitlementsFor(plan: PlanId): Entitlements {
  return PLANS[plan].entitlements;
}

export const checkoutSchema = z.object({ plan: z.enum(['PRO']) });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const sandboxCompleteSchema = z.object({ outcome: z.enum(['success', 'declined']) });
export type SandboxCompleteInput = z.infer<typeof sandboxCompleteSchema>;

export const sandboxSessionParamSchema = z.object({ id: z.string().min(16).max(80) });

export type BillingState = {
  plan: PlanId;
  status: 'ACTIVE' | 'CANCELED' | 'NONE';
  entitlements: Entitlements;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  plans: PlanDefinition[];
};

export type SandboxSessionInfo = { plan: PlanId; planName: string; priceCents: number };
export type SandboxCompleteResult = { outcome: 'success' | 'declined' };
