import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';

// Forward reference to avoid circular dependency
import type { Activity } from '../../activity/entities/activity.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @ManyToMany('Activity', 'tags')
  activities: Activity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
