import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { AuthToken } from './auth-token.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { SessionGuard } from './session.guard';
import { JwtModule } from '@nestjs/jwt';

@Module({ imports: [TypeOrmModule.forFeature([User, AuthToken]), JwtModule.register({})], controllers: [AuthController], providers: [AuthService, MailService, SessionGuard] })
export class AuthModule {}
