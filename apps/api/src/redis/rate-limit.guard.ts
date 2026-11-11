import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { RateLimitService, type RateLimitResult } from './rate-limit.service';

export const RATE_LIMIT_METADATA = 'rate-limit-rule';

export type RateLimitRule = {
  name: string;
  limit: number;
  windowSeconds: number;
  perEmail?: { limit: number };
};

export const RateLimit = (rule: RateLimitRule) => SetMetadata(RATE_LIMIT_METADATA, rule);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const rule = this.reflector.get<RateLimitRule | undefined>(
      RATE_LIMIT_METADATA,
      context.getHandler(),
    );
    if (!rule) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const ip = request.ip ?? 'unknown';

    this.enforce(
      response,
      await this.rateLimit.consume(`${rule.name}:ip:${ip}`, rule.limit, rule.windowSeconds),
    );

    const email = this.emailFrom(request);
    if (rule.perEmail && email) {
      const hash = createHash('sha256').update(email).digest('hex').slice(0, 32);
      this.enforce(
        response,
        await this.rateLimit.consume(
          `${rule.name}:email:${hash}`,
          rule.perEmail.limit,
          rule.windowSeconds,
        ),
      );
    }

    return true;
  }

  private enforce(response: Response, result: RateLimitResult) {
    if (result.allowed) return;
    response.setHeader('Retry-After', String(result.retryAfterSeconds));
    throw new HttpException(
      {
        message: 'Muitas tentativas. Tente novamente mais tarde.',
        retryAfter: result.retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private emailFrom(request: Request): string | null {
    const body = request.body as { email?: unknown } | undefined;
    return typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null;
  }
}
