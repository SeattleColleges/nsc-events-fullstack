import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';

export interface SocialMedia {
  [key: string]: string;
}

// Forward reference to avoid circular dependency
import type { EventRegistration } from '../../event-registration/entities/event-registration.entity';
import type { User } from '../../user/entities/user.entity';
import type { Tag } from '../../tag/entities/tag.entity';
import type { Media } from '../../media/entities/media.entity';

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId: string;

  @ManyToOne('User', 'createdActivities', {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User;

  @OneToMany('EventRegistration', 'activity')
  registrations: EventRegistration[];

  @Column()
  eventTitle: string;

  @Column('text')
  eventDescription: string;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz' })
  endDate: Date;

  @Column()
  eventLocation: string;

  @Column({ name: 'cover_photo_id', type: 'uuid', nullable: true })
  coverPhotoId?: string;

  @ManyToOne('Media', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cover_photo_id' })
  coverPhoto?: Media;

  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId?: string;

  @ManyToOne('Media', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'document_id' })
  document?: Media;

  @Column()
  eventHost: string;

  @Column({ nullable: true })
  eventMeetingURL?: string;

  @Column({ nullable: true })
  eventRegistration?: string;

  @Column()
  eventCapacity: string;

  @ManyToMany('Tag', 'activities')
  @JoinTable({
    name: 'activity_tags',
    joinColumn: { name: 'activity_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @Column({ nullable: true })
  eventSchedule?: string;

  @Column('simple-array', { nullable: true })
  eventSpeakers?: string[];

  @Column({ nullable: true })
  eventPrerequisites?: string;

  @Column({ nullable: true })
  eventCancellationPolicy?: string;

  @Column()
  eventContact: string;

  @Column('json', { nullable: false, default: {} })
  eventSocialMedia: SocialMedia;

  @Column({ nullable: true })
  eventPrivacy?: string;

  @Column({ nullable: true })
  eventAccessibility?: string;

  @Column({ nullable: true })
  eventNote?: string;

  @Column({ default: false })
  isHidden: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
