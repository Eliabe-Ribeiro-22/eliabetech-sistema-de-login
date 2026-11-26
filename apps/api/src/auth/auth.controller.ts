import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, TokenDto, TotpDto } from './auth.dto';
import { SessionGuard } from './session.guard';

const cookieOptions = (production: boolean, maxAge = 8 * 60 * 60 * 1000) => ({ httpOnly: true, secure: production, sameSite: 'strict' as const, path: '/', maxAge });
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly jwt: JwtService) {}
  @Post('register') @Throttle({ default: { limit: 5, ttl: 3600000 } }) register(@Body() body: RegisterDto) { return this.auth.register(body); }
  @Post('verify-email') verify(@Body() body: TokenDto) { return this.auth.verifyEmail(body.token); }
  @Post('forgot-password') @Throttle({ default: { limit: 5, ttl: 3600000 } }) forgot(@Body() body: ForgotPasswordDto) { return this.auth.requestPasswordReset(body.email); }
  @Post('reset-password') reset(@Body() body: ResetPasswordDto) { return this.auth.resetPassword(body.token, body.password); }
  @Post('login') @Throttle({ default: { limit: 10, ttl: 900000 } })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateCredentials(body.email, body.password);
    if (user.twoFactorEnabled) {
      const challenge = await this.jwt.signAsync({ sub: String(user.id), purpose: 'mfa' }, { secret: process.env.JWT_SECRET, expiresIn: '5m' });
      res.cookie('mfa_challenge', challenge, cookieOptions(process.env.NODE_ENV === 'production', 5 * 60 * 1000));
      return { requiresTwoFactor: true, message: 'Digite o código do aplicativo autenticador.' };
    }
    return this.setSession(user.id, res, user);
  }
  @Post('login/2fa')
  async login2fa(@Body() body: TotpDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const challenge = req.cookies?.mfa_challenge;
    if (!challenge) throw new Error('Desafio 2FA expirado. Entre novamente.');
    const payload = await this.jwt.verifyAsync(challenge, { secret: process.env.JWT_SECRET });
    if (payload.purpose !== 'mfa') throw new Error('Desafio 2FA inválido.');
    const result = await this.auth.finishLogin(String(payload.sub), body.code);
    res.clearCookie('mfa_challenge', cookieOptions(process.env.NODE_ENV === 'production', 5 * 60 * 1000));
    return this.setSession(result.user.id, res, result.user);
  }
  private async setSession(userId: string, res: Response, user?: object) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET precisa ter no mínimo 32 caracteres.');
    const token = await this.jwt.signAsync({ sub: String(userId), purpose: 'auth' }, { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    res.cookie('auth_token', token, cookieOptions(process.env.NODE_ENV === 'production'));
    return { message: 'Login realizado.', user: user || await this.auth.findSessionUser(userId) };
  }
  @Get('me') @UseGuards(SessionGuard) me(@Req() req: Request & { user?: unknown }) { return { user: req.user }; }
  @Post('2fa/setup') @UseGuards(SessionGuard) setup(@Req() req: Request & { user: { id: string } }) { return this.auth.setupTwoFactor(req.user.id); }
  @Post('2fa/enable') @UseGuards(SessionGuard) enable(@Req() req: Request & { user: { id: string } }, @Body() body: TotpDto) { return this.auth.enableTwoFactor(req.user.id, body.code); }
  @Post('2fa/disable') @UseGuards(SessionGuard) disable(@Req() req: Request & { user: { id: string } }, @Body() body: TotpDto) { return this.auth.disableTwoFactor(req.user.id, body.code); }
  @Post('logout') logout(@Res({ passthrough: true }) res: Response) {
    const opts = cookieOptions(process.env.NODE_ENV === 'production'); res.clearCookie('auth_token', opts); res.clearCookie('mfa_challenge', cookieOptions(process.env.NODE_ENV === 'production', 5 * 60 * 1000)); return { message: 'Sessão encerrada.' };
  }
}
