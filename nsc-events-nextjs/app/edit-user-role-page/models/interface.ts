/**
 * Represents a user.
 */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  pronouns: string;
  email: string;
  role: string;
}

export interface UsersData {
  users: User[];
  page: number;
  total: number;
  limit: number;
  totalPages: number;
}
