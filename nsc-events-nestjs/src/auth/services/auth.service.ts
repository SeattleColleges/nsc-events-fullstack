import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, Role } from '../../user/entities/user.entity';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  pronouns?: string;
  role?: Role;
}

export interface AuthResponse {
  token: string;
  user?: UserDocument; // Make user optional
}

@Injectable()
export class AuthService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  requestPasswordReset(email: string): Promise<{ message: string }> {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  // Register a new user
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { firstName, lastName, email, password, pronouns, role } =
      registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      pronouns,
      role: role || Role.user,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate JWT token with full user information
    const token = this.jwtService.sign({
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
    });

    // Only return the token for security, omit user details
    return {
      token,
    };
  }

  // Login user
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    try {
      // Find user by email
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        // Don't reveal whether the email exists for security
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate JWT token with proper payload, including names
      const token = this.jwtService.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      });

      // Only return the token for security
      return {
        token,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  // Validate user by ID (used by JWT strategy)
  async validateUser(id: string): Promise<UserDocument> {
    const user = await this.userRepository.findOne({ where: { id: id } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Remove password from user object before returning
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userResponse } = user;
    return userResponse as UserDocument;
  }

  // Change password
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.userRepository.update(userId, { password: hashedNewPassword });
  }

  // Verify JWT token
  async verifyToken(token: string): Promise<UserDocument> {
    try {
      const payload = this.jwtService.verify(token);
      return await this.validateUser(payload.id);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
