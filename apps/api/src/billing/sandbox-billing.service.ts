import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { PlanId } from '@sitebuilder/schemas';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.constants';
import { BillingPort, type BillingEventType, type BillingProviderEvent } from './billing.port';

const SESSION_TTL_SECONDS = 30 * 60;

type CheckoutSession = { userId: string; plan: PlanId };
export type SignedEvent = { rawBody: Buffer; signature: string };

@Injectable()
export class SandboxBillingService extends BillingPort {
  private readonly secret: string;
  private readonly webUrl: string;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    config: ConfigService,
  ) {
    super();
    const sessionSecret = config.getOrThrow<string>('SESSION_SECRET');
    this.secret =
      config.get<string>('BILLING_WEBHOOK_SECRET') ||
      createHmac('sha256', sessionSecret).update('billing-webhook').digest('hex');
    this.webUrl = config.get<string>('WEB_URL', 'http://localhost:3000');
  }

  async createCheckout(input: { userId: string; plan: PlanId }) {
    const sessionId = randomBytes(24).toString('base64url');
    const session: CheckoutSession = { userId: input.userId, plan: input.plan };
    await this.redis.set(
      this.sessionKey(sessionId),
      JSON.stringify(session),
      'EX',
      SESSION_TTL_SECONDS,
    );
    return { url: `${this.webUrl}/billing/sandbox/checkout?session=${sessionId}` };
  }

  async setCancelAtPeriodEnd() {
    return;
  }

  async getSession(sessionId: string): Promise<CheckoutSession | null> {
    const raw = await this.redis.get(this.sessionKey(sessionId));
    return raw ? (JSON.parse(raw) as CheckoutSession) : null;
  }

  async completeCheckout(
    sessionId: string,
    outcome: 'success' | 'declined',
  ): Promise<SignedEvent | null> {
    const raw = await this.redis.getdel(this.sessionKey(sessionId));
    if (!raw) return null;
    const session = JSON.parse(raw) as CheckoutSession;

    if (outcome === 'declined') {
      return this.signEvent('payment.failed', {
        sessionId,
        userId: session.userId,
        plan: session.plan,
      });
    }
    return this.signEvent('checkout.completed', {
      sessionId,
      userId: session.userId,
      plan: session.plan,
      providerSubscriptionId: `sub_${randomUUID()}`,
    });
  }

  signEvent(type: BillingEventType, data: BillingProviderEvent['data']): SignedEvent {
    const event: BillingProviderEvent = { id: `evt_${randomUUID()}`, type, data };
    const rawBody = Buffer.from(JSON.stringify(event));
    return { rawBody, signature: this.sign(rawBody) };
  }

  verifyWebhook(rawBody: Buffer, signature: string | undefined): BillingProviderEvent {
    if (!signature || !rawBody) throw new UnauthorizedException('Assinatura ausente');
    const expected = Buffer.from(this.sign(rawBody), 'hex');
    const received = Buffer.from(signature, 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      throw new UnauthorizedException('Assinatura inválida');
    }
    return JSON.parse(rawBody.toString('utf8')) as BillingProviderEvent;
  }

  private sign(rawBody: Buffer) {
    return createHmac('sha256', this.secret).update(rawBody).digest('hex');
  }

  private sessionKey(sessionId: string) {
    return `bill:session:${sessionId}`;
  }
}
