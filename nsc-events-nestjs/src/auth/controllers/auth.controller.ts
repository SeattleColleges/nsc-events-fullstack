import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto } from '../dto/login.dto';
import { SignUpDto } from '../dto/signup.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  // private so it is only accessed within this class
  constructor(private readonly authService: AuthService) {}

  @Post('/signup')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account and returns a JWT token',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiBody({ type: SignUpDto })
  signUp(@Body() signUpDto: SignUpDto): Promise<{ token: string }> {
    return this.authService.register(signUpDto);
  }

  @Post('/login')
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticates a user and returns a JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto })
  login(@Body() loginDto: LoginDto): Promise<{ token: string }> {
    return this.authService.login(loginDto);
  }

  // forgot password route
  @Post('/forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset link to the user email',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password reset email sent successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBody({ type: ForgotPasswordDto })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    // AuthService should send a reset link and return a generic message
    return this.authService.requestPasswordReset(dto.email);
  }

  // change password route
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @Post('/change-password')
  @ApiOperation({
    summary: 'Change user password',
    description: 'Changes the password for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password changed successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or invalid current password',
  })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    await this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }
}
