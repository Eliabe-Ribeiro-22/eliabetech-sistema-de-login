import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionGuard } from './session.guard';

@Module({ imports: [TypeOrmModule.forFeature([User]), JwtModule.register({})], controllers: [AuthController], providers: [AuthService, SessionGuard] })
export class AuthModule {}
