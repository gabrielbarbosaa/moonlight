import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { SESSION_COOKIE, SessionService } from './session.service';

export type AuthenticatedRequest = Request & { userId: string; sessionToken: string };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || !token) throw new UnauthorizedException();

    const userId = await this.sessions.resolve(token);
    if (!userId) throw new UnauthorizedException();

    request.userId = userId;
    request.sessionToken = token;
    return true;
  }
}
