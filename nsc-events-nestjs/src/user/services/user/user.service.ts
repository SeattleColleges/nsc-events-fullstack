import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  UserDocument,
  GoogleCredentials,
  Role,
} from '../../entities/user.entity';

export interface UserSearchFilters {
  search?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: Role;
  page?: number;
  limit?: number;
}

export interface UserSearchData {
  users: UserDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ----------------- Get all users ----------------- \\
  async getAllUsers(): Promise<any> {
    const users = await this.userRepository.find();
    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      pronouns: user.pronouns,
      email: user.email,
      role: user.role,
    }));
  }

  // ----------------- Search Users ----------------------------- \\
  async searchUsers(filters: UserSearchFilters): Promise<UserSearchData> {
    try {
      const {
        search,
        firstName,
        lastName,
        email,
        role,
        page = 1,
        limit = 10,
      } = filters;
      const skip = (page - 1) * limit;

      const queryBuilder = this.userRepository.createQueryBuilder('user');
      let hasConditions = false;

      // Handle general search parameter
      if (search) {
        queryBuilder.where(
          '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
          { search: `%${search}%` },
        );
        hasConditions = true;
      }

      // Handle individual field searches
      if (firstName) {
        if (hasConditions) {
          queryBuilder.andWhere('user.firstName ILIKE :firstName', {
            firstName: `%${firstName}%`,
          });
        } else {
          queryBuilder.where('user.firstName ILIKE :firstName', {
            firstName: `%${firstName}%`,
          });
          hasConditions = true;
        }
      }

      if (lastName) {
        if (hasConditions) {
          queryBuilder.andWhere('user.lastName ILIKE :lastName', {
            lastName: `%${lastName}%`,
          });
        } else {
          queryBuilder.where('user.lastName ILIKE :lastName', {
            lastName: `%${lastName}%`,
          });
          hasConditions = true;
        }
      }

      if (email) {
        if (hasConditions) {
          queryBuilder.andWhere('user.email ILIKE :email', {
            email: `%${email}%`,
          });
        } else {
          queryBuilder.where('user.email ILIKE :email', {
            email: `%${email}%`,
          });
          hasConditions = true;
        }
      }

      if (role) {
        if (hasConditions) {
          queryBuilder.andWhere('user.role = :role', { role });
        } else {
          queryBuilder.where('user.role = :role', { role });
        }
      }

      const [users, total] = await queryBuilder
        .orderBy('user.lastName', 'ASC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return {
        users: users as UserDocument[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new HttpException(
        'Error retrieving users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get user by id ----------------- \\
  async getUserById(id: string): Promise<UserDocument> {
    try {
      const user = await this.userRepository.findOne({ where: { id: id } });
      if (!user) {
        throw new BadRequestException('User not found');
      }
      return user as UserDocument;
    } catch (error) {
      throw new HttpException(
        'Error retrieving user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get user by email ----------------- \\
  async getUserByEmail(email: string): Promise<UserDocument | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { email: email },
      });
      return user as UserDocument | null;
    } catch (error) {
      throw new HttpException(
        'Error retrieving user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Create user ----------------- \\
  async createUser(userData: Partial<User>): Promise<UserDocument> {
    try {
      const newUser = this.userRepository.create(userData);
      const savedUser = await this.userRepository.save(newUser);
      return savedUser as UserDocument;
    } catch (error) {
      throw new HttpException(
        'Error creating user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Update user ----------------- \\
  async updateUser(id: string, userData: Partial<User>): Promise<UserDocument> {
    try {
      const user = await this.getUserById(id);
      Object.assign(user, userData);
      return await this.userRepository.save(user);
    } catch (error) {
      throw new HttpException(
        'Error updating user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Delete user ----------------- \\
  async deleteUser(id: string): Promise<void> {
    try {
      const result = await this.userRepository.delete(id);
      if (result.affected === 0) {
        throw new BadRequestException('User not found');
      }
    } catch (error) {
      throw new HttpException(
        'Error deleting user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Update user role ----------------- \\
  async updateUserRole(id: string, role: Role): Promise<UserDocument> {
    try {
      const user = await this.getUserById(id);
      user.role = role;
      return await this.userRepository.save(user);
    } catch (error) {
      throw new HttpException(
        'Error updating user role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Update Google credentials ----------------- \\
  async updateGoogleCredentials(
    id: string,
    credentials: GoogleCredentials,
  ): Promise<UserDocument> {
    try {
      const user = await this.getUserById(id);
      user.googleCredentials = credentials;
      return await this.userRepository.save(user);
    } catch (error) {
      throw new HttpException(
        'Error updating Google credentials',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
