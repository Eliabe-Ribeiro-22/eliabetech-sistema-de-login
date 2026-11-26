import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { User } from '../users/user.entity';
import { AuthToken } from './auth-token.entity';
import { MailService } from './mail.service';
import { RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>, @InjectRepository(AuthToken) private readonly tokens: Repository<AuthToken>, private readonly mail: MailService) { authenticator.options = { window: 1 }; }
  private hash(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
  private async issue(userId: string, purpose: AuthToken['purpose'], minutes: number) {
    const raw = crypto.randomBytes(32).toString('hex');
    const token = this.tokens.create({ userId, tokenHash: this.hash(raw), purpose, expiresAt: new Date(Date.now() + minutes * 60000) });
    await this.tokens.save(token); return raw;
  }
  private async consume(raw: string, purpose: AuthToken['purpose']) {
    if (!/^[a-f0-9]{64}$/.test(raw)) throw new BadRequestException('Token inválido ou expirado.');
    const token = await this.tokens.findOne({ where: { tokenHash: this.hash(raw), purpose } });
    if (!token || token.expiresAt.getTime() <= Date.now()) throw new BadRequestException('Token inválido ou expirado.');
    await this.tokens.delete(token.id); return token.userId;
  }
  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    if (await this.users.exist({ where: { email } })) throw new ConflictException('Este email já está cadastrado.');
    const user = await this.users.save(this.users.create({ firstName: input.firstName.trim(), lastName: input.lastName.trim(), phone: input.phone.trim(), email, passwordHash: await bcrypt.hash(input.password, 12), emailVerified: false }));
    const token = await this.issue(user.id, 'verify_email', 30);
    try { await this.mail.send(email, 'Confirme seu email', `Olá ${user.firstName}, confirme seu email: ${process.env.APP_BASE_URL || 'http://localhost:3000'}/verify?token=${token}`); }
    catch (error) { await this.tokens.delete({ userId: user.id, purpose: 'verify_email' }); await this.users.delete(user.id); throw error; }
    return { message: 'Cadastro iniciado. Confira seu email para confirmar a conta.' };
  }
  async verifyEmail(raw: string) {
    const userId = await this.consume(raw, 'verify_email');
    await this.users.update(userId, { emailVerified: true });
    return { message: 'Email confirmado. Você já pode entrar.' };
  }
  async validateCredentials(emailValue: string, password: string) {
    const user = await this.users.createQueryBuilder('user').addSelect('user.passwordHash').where('user.email = :email', { email: emailValue.trim().toLowerCase() }).getOne();
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new UnauthorizedException('Email ou senha incorretos.');
    if (!user.emailVerified) throw new UnauthorizedException('Confirme seu email antes de entrar.');
    const { passwordHash, twoFactorSecret, ...safeUser } = user; return safeUser;
  }
  async findSessionUser(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('Sessão inválida.');
    const { passwordHash, twoFactorSecret, ...safeUser } = user; return safeUser;
  }
  async finishLogin(userId: string, code?: string) {
    const user = await this.users.createQueryBuilder('user').addSelect('user.twoFactorSecret').where('user.id = :id', { id: userId }).getOne();
    if (!user) throw new UnauthorizedException('Conta não encontrada.');
    if (user.twoFactorEnabled) {
      if (!code) return { requiresTwoFactor: true, userId: user.id };
      if (!user.twoFactorSecret || !authenticator.check(code.replace(/\s/g, ''), user.twoFactorSecret)) throw new UnauthorizedException('Código 2FA incorreto ou expirado.');
    }
    const { passwordHash, twoFactorSecret, ...safeUser } = user; return { user: safeUser };
  }
  async setupTwoFactor(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Conta não encontrada.');
    if (user.twoFactorEnabled) throw new ConflictException('2FA já está ativo.');
    const secret = authenticator.generateSecret();
    await this.users.update(userId, { twoFactorSecret: secret });
    return { qrCodeDataUrl: await QRCode.toDataURL(authenticator.keyuri(user.email, 'EliabeTech', secret)), manualKey: secret };
  }
  async enableTwoFactor(userId: string, code: string) {
    const user = await this.users.createQueryBuilder('user').addSelect('user.twoFactorSecret').where('user.id = :id', { id: userId }).getOne();
    if (!user?.twoFactorSecret || !authenticator.check(code, user.twoFactorSecret)) throw new BadRequestException('Código inválido. Inicie novamente a configuração.');
    await this.users.update(userId, { twoFactorEnabled: true }); return { message: '2FA ativado.' };
  }
  async disableTwoFactor(userId: string, code: string) {
    const user = await this.users.createQueryBuilder('user').addSelect('user.twoFactorSecret').where('user.id = :id', { id: userId }).getOne();
    if (!user?.twoFactorEnabled || !user.twoFactorSecret || !authenticator.check(code, user.twoFactorSecret)) throw new BadRequestException('Código 2FA inválido.');
    await this.users.update(userId, { twoFactorEnabled: false, twoFactorSecret: null }); return { message: '2FA desativado.' };
  }
  async requestPasswordReset(emailValue: string) {
    const user = await this.users.findOne({ where: { email: emailValue.trim().toLowerCase() } });
    if (user) {
      const token = await this.issue(user.id, 'reset_password', 30);
      await this.mail.send(user.email, 'Redefinição de senha', `Redefina sua senha: ${process.env.APP_BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`);
    }
    return { message: 'Se o email estiver cadastrado, enviaremos instruções para redefinir a senha.' };
  }
  async resetPassword(raw: string, password: string) {
    const userId = await this.consume(raw, 'reset_password');
    await this.users.update(userId, { passwordHash: await bcrypt.hash(password, 12) });
    return { message: 'Senha redefinida com sucesso.' };
  }
}
