import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserDocument, Role } from '../../user/entities/user.entity';
import { EmailService } from '../../email/email.service';

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
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  // Request password reset - now with actual email sending and token storage
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    // Check if user exists
    const user = await this.userRepository.findOne({ where: { email } });

    // Always return success message to prevent email enumeration attacks
    const successMessage =
      'If an account with this email exists, you will receive a password reset link.';

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return { message: successMessage };
    }

    try {
      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(resetToken, 12);

      // Set token and expiration (1 hour)
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

      await this.userRepository.save(user);

      // Send email with reset token (not the hashed version)
      await this.emailService.sendPasswordResetEmail(email, resetToken);

      console.log(`Password reset email sent successfully to: ${email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't expose email error to user for security
    }

    return { message: successMessage };
  }

  // Reset password with token
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Find all users with reset tokens (we'll check each one)
    const users = await this.userRepository.find({
      select: ['id', 'email', 'resetPasswordToken', 'resetPasswordExpires'],
    });

    let validUser = null;

    // Check each user's token to see if it matches
    for (const user of users) {
      if (user.resetPasswordToken && user.resetPasswordExpires) {
        // Check if token hasn't expired
        if (user.resetPasswordExpires > new Date()) {
          // Verify the token
          const isValidToken = await bcrypt.compare(
            token,
            user.resetPasswordToken,
          );
          if (isValidToken) {
            validUser = user;
            break;
          }
        }
      }
    }

    if (!validUser) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Get the full user object for updating
    const fullUser = await this.userRepository.findOne({
      where: { id: validUser.id },
    });

    if (!fullUser) {
      throw new BadRequestException('User not found');
    }

    // check to see if new password is the same as the current password
    const isSameAsCurrentPassword = await bcrypt.compare(
      newPassword,
      fullUser.password,
    );
    if (isSameAsCurrentPassword) {
      throw new BadRequestException(
        'New password must be different from your current password',
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token fields
    fullUser.password = hashedPassword;
    fullUser.resetPasswordToken = null;
    fullUser.resetPasswordExpires = null;

    await this.userRepository.save(fullUser);

    console.log(`Password reset successfully for user: ${fullUser.email}`);

    return { message: 'Password reset successfully' };
  }

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

    // check to see if new password is the same as the current password
    const isSameAsCurrentPassword = await bcrypt.compare(
      newPassword,
      user.password,
    );
    if (isSameAsCurrentPassword) {
      throw new BadRequestException(
        'New password must be different from your current password',
      );
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
