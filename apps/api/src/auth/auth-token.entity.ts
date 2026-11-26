import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'auth_tokens' })
@Index('auth_token_hash_unique', ['tokenHash'], { unique: true })
export class AuthToken {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id: string;
  @Column({ name: 'user_id', type: 'bigint', unsigned: true }) userId: string;
  @Column({ name: 'token_hash', type: 'char', length: 64 }) tokenHash: string;
  @Column({ type: 'enum', enum: ['verify_email', 'reset_password'] }) purpose: 'verify_email' | 'reset_password';
  @Column({ name: 'expires_at', type: 'datetime' }) expiresAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt: Date;
}
