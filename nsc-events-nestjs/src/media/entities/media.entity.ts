import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

// Forward reference to avoid circular dependency
import type { User } from '../../user/entities/user.entity';

export enum MediaType {
  IMAGE = 'image',
  DOCUMENT = 'document',
}

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column()
  s3Key: string;

  @Column()
  s3Url: string;

  @Column({
    type: 'enum',
    enum: MediaType,
    default: MediaType.IMAGE,
  })
  type: MediaType;

  @Column({ name: 'uploaded_by_user_id', type: 'uuid', nullable: true })
  uploadedByUserId: string;

  @ManyToOne('User', {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
