import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Activity } from '../../activity/entities/activity.entity';

@Entity('event_registrations')
export class EventRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'activity_id', type: 'uuid' })
  activityId: string;

  @ManyToOne(() => Activity, (activity) => activity.registrations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.eventRegistrations, {
    onDelete: 'CASCADE',
    eager: true, // Always load user data with registration
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Registration-specific fields (may differ from user profile per event)
  @Column({ nullable: true })
  college: string;

  @Column({ nullable: true })
  yearOfStudy: string;

  @Column({ default: false })
  isAttended: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
