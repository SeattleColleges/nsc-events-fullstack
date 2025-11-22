import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  /**
   * User email address
   * @example 'user@example.com'
   */
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Please enter correct email' })
  readonly email: string;

  /**
   * User password
   * @example 'Password123!'
   */
  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'Password123!',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  readonly password: string;
}
