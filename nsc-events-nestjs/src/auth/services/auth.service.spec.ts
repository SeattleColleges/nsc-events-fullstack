import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {
  AuthService,
  LoginDto,
  RegisterDto,
  AuthResponse,
} from './auth.service';
import { User, Role } from '../../user/entities/user.entity';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EmailService } from '../../email/email.service';

// Type for mocked repository to ensure type safety
type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: MockRepository<User>;
  let jwtService: JwtService;
  let emailService: EmailService;
  let module: TestingModule;

  // Mock user data
  const mockUser: User = {
    id: 'test-uuid',
    firstName: 'User',
    lastName: 'Nsc',
    email: 'user@nsc.com',
    password: 'Password123',
    pronouns: 'he/him',
    role: Role.user,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    eventRegistrations: [],
    createdActivities: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLoginDto: LoginDto = {
    email: 'user@nsc.com',
    password: 'Password123',
  };

  const mockRegisterDto: RegisterDto = {
    firstName: 'User',
    lastName: 'Nsc',
    email: 'user@nsc.com',
    password: 'Password123',
    pronouns: 'he/him',
  };

  const mockToken = 'mock.jwt.token';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendPasswordResetEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Login Tests
  describe('login', () => {
    it('should successfully login a user with valid credentials', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));
      jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);

      const result: AuthResponse = await service.login(mockLoginDto);

      expect(result).toEqual({ token: mockToken });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockLoginDto.email },
      });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(userRepository, 'findOne').mockRejectedValue(new Error());

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // Register Tests
  describe('register', () => {
    it('should successfully register a new user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve('hashedPassword'));
      jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);

      const result: AuthResponse = await service.register(mockRegisterDto);

      expect(result).toEqual({ token: mockToken });
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user already exists', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should assign default role if not provided', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve('hashedPassword'));
      jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);

      await service.register(mockRegisterDto);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.user }),
      );
    });
  });

  // Validate User Tests
  describe('validateUser', () => {
    it('should successfully validate an existing user', async () => {
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.password;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.validateUser(mockUser.id);

      expect(result).toEqual(expect.objectContaining(userWithoutPassword));
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.validateUser('non-existent-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // Change Password Tests
  describe('changePassword', () => {
    it('should successfully change password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementationOnce(() => Promise.resolve(true))
        .mockImplementationOnce(() => Promise.resolve(false));

      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve('newHashedPassword'));
      jest.spyOn(userRepository, 'update').mockResolvedValue(undefined);

      await expect(
        service.changePassword('user-id', 'currentPassword', 'newPassword'),
      ).resolves.not.toThrow();

      expect(userRepository.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException for incorrect current password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      await expect(
        service.changePassword('user-id', 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-existent user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.changePassword(
          'non-existent-id',
          'currentPassword',
          'newPassword',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // Verify Token Tests
  describe('verifyToken', () => {
    const mockPayload = { id: mockUser.id };

    it('should successfully verify a valid token', async () => {
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.password;

      jest.spyOn(jwtService, 'verify').mockReturnValue(mockPayload);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.verifyToken(mockToken);

      expect(result).toEqual(expect.objectContaining(userWithoutPassword));
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error();
      });

      await expect(service.verifyToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for valid token but non-existent user', async () => {
      jest.spyOn(jwtService, 'verify').mockReturnValue(mockPayload);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.verifyToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // Request Password Reset Tests
  describe('requestPasswordReset', () => {
    it('should successfully request password reset for existing user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      jest.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValue();

      const result = await service.requestPasswordReset('user@nsc.com');

      expect(result.message).toContain('If an account with this email exists');
      expect(userRepository.save).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return success message even for non-existent user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.requestPasswordReset(
        'nonexistent@email.com',
      );

      expect(result.message).toContain('If an account with this email exists');
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle email service errors gracefully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      jest
        .spyOn(emailService, 'sendPasswordResetEmail')
        .mockRejectedValue(new Error('Email failed'));

      const result = await service.requestPasswordReset('user@nsc.com');

      expect(result.message).toContain('If an account with this email exists');
    });
  });

  // Reset Password Tests
  describe('resetPassword', () => {
    const validToken = 'valid-reset-token';
    const hashedToken = 'hashed-reset-token';

    it('should successfully reset password with valid token', async () => {
      const userWithToken = {
        ...mockUser,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 3600000), // 1 hour from now
      };

      jest.spyOn(userRepository, 'find').mockResolvedValue([userWithToken]);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithToken);
      jest.spyOn(userRepository, 'save').mockResolvedValue(userWithToken);

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementationOnce(() => Promise.resolve(true))
        .mockImplementationOnce(() => Promise.resolve(false));

      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve('new-hashed-password'));

      const result = await service.resetPassword(validToken, 'newPassword123');

      expect(result.message).toBe('Password reset successfully');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      jest.spyOn(userRepository, 'find').mockResolvedValue([]);

      await expect(
        service.resetPassword('invalid-token', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      const userWithExpiredToken = {
        ...mockUser,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() - 3600000), // 1 hour ago (expired)
      };

      jest
        .spyOn(userRepository, 'find')
        .mockResolvedValue([userWithExpiredToken]);

      await expect(
        service.resetPassword(validToken, 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
