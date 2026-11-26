import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id: string;
  @Column({ name: 'first_name', length: 80 }) firstName: string;
  @Column({ name: 'last_name', length: 120 }) lastName: string;
  @Column({ length: 24 }) phone: string;
  @Column({ length: 254, unique: true }) email: string;
  @Column({ name: 'password_hash', length: 255, select: false }) passwordHash: string;
  @Column({ name: 'email_verified', type: 'boolean', default: false }) emailVerified: boolean;
  @Column({ name: 'two_factor_enabled', type: 'boolean', default: false }) twoFactorEnabled: boolean;
  @Column({ name: 'two_factor_secret', length: 255, nullable: true, select: false }) twoFactorSecret: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt: Date;
}
