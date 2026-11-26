import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    if (await this.users.exist({ where: { email } })) throw new ConflictException('Este email já está cadastrado.');
    const user = this.users.create({
      firstName: input.firstName.trim(), lastName: input.lastName.trim(), phone: input.phone.trim(),
      email, passwordHash: await bcrypt.hash(input.password, 12), emailVerified: false,
    });
    try { await this.users.save(user); }
    catch (error) { if (error?.code === 'ER_DUP_ENTRY') throw new ConflictException('Este email já está cadastrado.'); throw error; }
    return { message: 'Cadastro realizado. A confirmação de email será habilitada na próxima etapa da migração.' };
  }

  async validateCredentials(emailValue: string, password: string) {
    const user = await this.users.createQueryBuilder('user').addSelect('user.passwordHash')
      .where('user.email = :email', { email: emailValue.trim().toLowerCase() }).getOne();
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new UnauthorizedException('Email ou senha incorretos.');
    const { passwordHash, twoFactorSecret, ...safeUser } = user;
    return safeUser;
  }

  async findSessionUser(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException('Sessão inválida.');
    const { passwordHash, twoFactorSecret, ...safeUser } = user;
    return safeUser;
  }
}
