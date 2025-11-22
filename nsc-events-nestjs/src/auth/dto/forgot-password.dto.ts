import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  /**
   * Email address to send password reset link to
   * @example 'user@example.com'
   */
  @ApiProperty({
    description: 'Email address for password reset',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
