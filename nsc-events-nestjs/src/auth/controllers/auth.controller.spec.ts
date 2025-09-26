import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { SignUpDto } from '../dto/signup.dto';
import { Role } from '../../user/entities/user.entity';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    changePassword: jest.fn(),
  };
  const mockSignUpDto: SignUpDto = {
    firstName: 'Test',
    lastName: 'User',
    pronouns: 'they/them',
    email: 'testuser@example.com',
    password: 'testpassword123',
    role: Role.user,
  };

  const mockLoginDto: LoginDto = {
    email: 'testuser@example.com',
    password: 'testpassword123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should return a token and user', async () => {
      const mockUser = {
        id: '1',
        email: mockSignUpDto.email,
        firstName: mockSignUpDto.firstName,
        lastName: mockSignUpDto.lastName,
        pronouns: mockSignUpDto.pronouns,
        role: mockSignUpDto.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = { token: 'your-test-token', user: mockUser };

      jest.spyOn(authService, 'register').mockResolvedValue(result);

      expect(await authController.signUp(mockSignUpDto)).toBe(result);
    });

    it('should throw an error for existing email address', async () => {
      const errorMessage = 'Email address already exists';

      jest
        .spyOn(authService, 'register')
        .mockRejectedValue(new Error(errorMessage));

      await expect(authController.signUp(mockSignUpDto)).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('login', () => {
    it('should return a token and user', async () => {
      const mockUser = {
        id: '1',
        email: mockLoginDto.email,
        firstName: 'Test',
        lastName: 'User',
        pronouns: 'they/them',
        role: Role.user,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = { token: 'your-test-token', user: mockUser };

      jest.spyOn(authService, 'login').mockResolvedValue(result);

      expect(await authController.login(mockLoginDto)).toBe(result);
    });

    it('should throw an error for invalid credentials', async () => {
      const errorMessage = 'Invalid email or password';

      jest
        .spyOn(authService, 'login')
        .mockRejectedValue(new Error(errorMessage));

      await expect(authController.login(mockLoginDto)).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('changePassword', () => {
    it('should return a successful message', async () => {
      const mockRequest = { user: { id: '1' } };
      const changePasswordDto = {
        currentPassword: 'oldpass',
        newPassword: 'newpass',
        newPasswordConfirm: 'newpass',
      };

      jest.spyOn(authService, 'changePassword').mockResolvedValue(undefined);

      const result = await authController.changePassword(
        mockRequest,
        changePasswordDto,
      );

      expect(authService.changePassword).toHaveBeenCalledWith(
        '1',
        'oldpass',
        'newpass',
      );
      expect(result).toEqual({ message: 'Password changed successfully' });
    });
  });
});
