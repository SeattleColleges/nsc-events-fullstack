import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface SocialMedia {
  [key: string]: string;
}

export interface Attendee {
  firstName: string;
  lastName: string;
}

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId: string;

  @Column()
  eventTitle: string;

  @Column('text')
  eventDescription: string;

  @Column('timestamp')
  eventDate: Date;

  @Column()
  eventStartTime: string;

  @Column()
  eventEndTime: string;

  @Column()
  eventLocation: string;

  @Column({ default: '' })
  eventCoverPhoto?: string;

  @Column({ default: '' })
  eventDocument?: string;

  @Column()
  eventHost: string;

  @Column({ nullable: true })
  eventMeetingURL?: string;

  @Column({ nullable: true })
  eventRegistration?: string;

  @Column()
  eventCapacity: string;

  @Column('simple-array')
  eventTags: string[];

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

  @Column('json')
  eventSocialMedia: SocialMedia;

  @Column({ default: 0 })
  attendanceCount?: number;

  @Column('json', { nullable: true })
  attendees?: Attendee[];

  @Column({ nullable: true })
  eventPrivacy?: string;

  @Column({ nullable: true })
  eventAccessibility?: string;

  @Column()
  eventNote: string;

  @Column({ default: false })
  isHidden: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
