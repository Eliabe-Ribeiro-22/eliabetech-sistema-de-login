import { Module } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { User } from './users/user.entity';
import { AuthToken } from './auth/auth-token.entity';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]), TypeOrmModule.forRoot({ type: 'mysql', host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), username: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [User, AuthToken], synchronize: false }), AuthModule], providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }] })
export class AppModule {}
