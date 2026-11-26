import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.auth_token;
    if (!token) throw new UnauthorizedException('Faça login para continuar.');
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET });
      if (payload.purpose !== 'auth' || !payload.sub) throw new Error('Invalid purpose');
      request.user = await this.auth.findSessionUser(String(payload.sub));
      return true;
    } catch { throw new UnauthorizedException('Sessão inválida ou expirada.'); }
  }
}
