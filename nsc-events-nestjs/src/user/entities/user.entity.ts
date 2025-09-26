import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Interfaces moved from user.model.ts to maintain API compatibility
 * This allows us to use the same interfaces with PostgreSQL
 */

export interface GoogleCredentials {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiryDate?: number;
}

/**
 * UserDocument maintains the same interface as before
 * but now extends our PostgreSQL-compatible Document base class
 */
export interface UserDocument {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  pronouns: string;
  password?: string;
  role: Role;
  googleCredentials?: GoogleCredentials;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSearchData {
  data: {
    id: string;
    firstName: string;
    lastName: string;
    pronouns: string;
    email: string;
    role: string;
  }[];
  page: number;
  total: number;
  pages: number;
}

export interface UserSearchFilters {
  firstName?: string;
  lastName?: string;
  email?: string;
  page?: number;
  role?: string;
}

export enum Role {
  admin = 'admin',
  creator = 'creator',
  user = 'user',
}

@Entity('users') // Table name in PostgreSQL
export class User implements UserDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  pronouns: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.user,
  })
  role: Role;

  @Column({ type: 'json', nullable: true })
  googleCredentials?: GoogleCredentials;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
