import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import type { LoginInput, RegisterInput, VerifyCodeInput } from '@moonlight/schemas';
import { OtpPort } from '../otp/otp.port';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

const CHALLENGE_TTL_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly superadminEmails: Set<string>;
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpPort,
    private readonly sessions: SessionService,
    config: ConfigService,
  ) {
    this.superadminEmails = new Set(
      config
        .get<string>('SUPERADMIN_EMAILS', '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  async register(input: RegisterInput, ip?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return { challengeId: randomUUID() };

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: { email: input.email, passwordHash },
    });
    try {
      return await this.issueChallenge(user.id, user.email, ip);
    } catch (error) {
      await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      throw error;
    }
  }

  async login(input: LoginInput, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      await argon2.verify(await this.getDummyHash(), input.password);
      return { challengeId: randomUUID() };
    }

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return this.issueChallenge(user.id, user.email, ip);
  }

  async verifyCode(input: VerifyCodeInput): Promise<{ userId: string; sessionToken: string }> {
    const now = new Date();
    const claimed = await this.prisma.authCode.updateMany({
      where: {
        id: input.challengeId,
        consumedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: MAX_CODE_ATTEMPTS },
      },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count === 0) throw new UnauthorizedException('Código inválido ou expirado');

    const record = await this.prisma.authCode.findUniqueOrThrow({
      where: { id: input.challengeId },
      select: { id: true, userId: true, user: { select: { email: true } } },
    });

    const result = await this.otp.verify(record.user.email, input.code);
    if (result !== 'ok') {
      if (result === 'too_many_attempts') {
        await this.prisma.authCode.updateMany({
          where: { id: record.id, consumedAt: null },
          data: { consumedAt: now },
        });
      }
      throw new UnauthorizedException('Código inválido ou expirado');
    }

    const consumed = await this.prisma.authCode.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count === 0) throw new UnauthorizedException('Código inválido ou expirado');

    const user = await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });
    if (user.role !== 'SUPERADMIN' && this.superadminEmails.has(user.email)) {
      await this.prisma.user.update({ where: { id: user.id }, data: { role: 'SUPERADMIN' } });
    }

    const sessionToken = await this.sessions.create(record.userId);
    return { userId: record.userId, sessionToken };
  }

  async logout(token: string) {
    await this.sessions.destroy(token);
  }

  private async issueChallenge(userId: string, email: string, ip?: string) {
    await this.otp.request(email, ip);

    await this.prisma.authCode.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const challenge = await this.prisma.authCode.create({
      data: {
        userId,
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MINUTES * 60_000),
      },
      select: { id: true },
    });
    return { challengeId: challenge.id };
  }

  private getDummyHash() {
    this.dummyHash ??= argon2.hash(randomUUID(), { type: argon2.argon2id });
    return this.dummyHash;
  }
}
