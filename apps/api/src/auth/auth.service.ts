import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { LoginInput, RegisterInput, VerifyCodeInput } from '@sitebuilder/schemas';
import { MailPort } from '../mail/mail.port';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

const CODE_TTL_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly secret: string;
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailPort,
    private readonly sessions: SessionService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('SESSION_SECRET');
  }

  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return { challengeId: randomUUID() };

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await this.prisma.user.create({
      data: { email: input.email, passwordHash },
    });
    return this.issueChallenge(user.id, user.email);
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      await argon2.verify(await this.getDummyHash(), input.password);
      return { challengeId: randomUUID() };
    }

    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return this.issueChallenge(user.id, user.email);
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
    });
    if (!this.codeMatches(record.codeHash, record.id, input.code)) {
      throw new UnauthorizedException('Código inválido ou expirado');
    }

    const consumed = await this.prisma.authCode.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count === 0) throw new UnauthorizedException('Código inválido ou expirado');

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });

    const sessionToken = await this.sessions.create(record.userId);
    return { userId: record.userId, sessionToken };
  }

  async logout(token: string) {
    await this.sessions.destroy(token);
  }

  private async issueChallenge(userId: string, email: string) {
    await this.prisma.authCode.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const id = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

    await this.prisma.authCode.create({
      data: {
        id,
        userId,
        codeHash: this.hashCode(id, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
      },
    });

    await this.mail.sendAuthCode(email, code, CODE_TTL_MINUTES);
    return { challengeId: id };
  }

  private hashCode(challengeId: string, code: string) {
    return createHmac('sha256', this.secret).update(`${challengeId}:${code}`).digest('hex');
  }

  private codeMatches(storedHash: string, challengeId: string, code: string) {
    const expected = Buffer.from(storedHash, 'hex');
    const actual = Buffer.from(this.hashCode(challengeId, code), 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private getDummyHash() {
    this.dummyHash ??= argon2.hash(randomUUID(), { type: argon2.argon2id });
    return this.dummyHash;
  }
}
