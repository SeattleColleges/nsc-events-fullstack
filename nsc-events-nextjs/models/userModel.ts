// Frontend user type definitions for the PostgreSQL-based backend
// These interfaces should match the backend entities

export enum Role {
  ADMIN = 'admin',
  CREATOR = 'creator',
  USER = 'user',
}

export interface GoogleCredentials {
  googleId: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  pronouns?: string;
  email: string;
  password: string;
  role: Role;
  googleCredentials?: GoogleCredentials;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument extends User {
  // Extension of User for compatibility
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  pronouns?: string;
  email: string;
  password: string;
  role?: Role;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  pronouns?: string;
  email?: string;
  role?: Role;
  googleCredentials?: GoogleCredentials;
}

export interface UserSearchFilters {
  search?: string;
  role?: Role;
  page?: number;
  limit?: number;
}

export interface UserSearchData {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}