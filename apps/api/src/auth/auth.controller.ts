import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { SessionGuard } from './session.guard';

const cookieOptions = (production: boolean) => ({ httpOnly: true, secure: production, sameSite: 'strict' as const, path: '/', maxAge: 8 * 60 * 60 * 1000 });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, @Inject(JwtService) private readonly jwt: JwtService) {}

  @Post('register') @Throttle({ default: { limit: 5, ttl: 3600000 } })
  register(@Body() body: RegisterDto) { return this.auth.register(body); }

  @Post('login') @Throttle({ default: { limit: 10, ttl: 900000 } })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const user = await this.auth.validateCredentials(body.email, body.password);
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres.');
    const token = await this.jwt.signAsync({ sub: String(user.id), purpose: 'auth' }, { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    response.cookie('auth_token', token, cookieOptions(process.env.NODE_ENV === 'production'));
    return { message: 'Login realizado.', user };
  }

  @Get('me') @UseGuards(SessionGuard)
  me(@Req() request: Request & { user?: unknown }) { return { user: request.user }; }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('auth_token', cookieOptions(process.env.NODE_ENV === 'production'));
    return { message: 'Sessão encerrada.' };
  }
}
