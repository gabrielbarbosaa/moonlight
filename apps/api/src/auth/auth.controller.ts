import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, VerifyCodeDto } from './auth.dto';
import { AuthService } from './auth.service';
import { AuthenticatedRequest, SessionGuard } from './session.guard';
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from './session.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  @HttpCode(202)
  @ApiOperation({ summary: 'Cria a conta e envia o código de 2FA por e-mail' })
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(202)
  @ApiOperation({ summary: 'Valida a senha e envia o código de 2FA por e-mail' })
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Post('verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Valida o código de 2FA e abre a sessão (cookie)' })
  async verify(@Body() body: VerifyCodeDto, @Res({ passthrough: true }) res: Response) {
    const { userId, sessionToken } = await this.auth.verifyCode(body);
    res.cookie(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL_SECONDS * 1000,
    });
    return { userId };
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Encerra a sessão atual' })
  async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.sessionToken);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE)
  @ApiOperation({ summary: 'Retorna o usuário autenticado' })
  async me(@Req() req: AuthenticatedRequest) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: req.userId },
      select: { id: true, email: true, role: true, emailVerified: true },
    });
  }
}
