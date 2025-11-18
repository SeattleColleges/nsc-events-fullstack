import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Role } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  /**
   * User's first name
   * @example 'John'
   */
  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsNotEmpty()
  @IsString()
  readonly firstName: string;

  /**
   * User's last name
   * @example 'Doe'
   */
  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsNotEmpty()
  @IsString()
  readonly lastName: string;

  /**
   * User's pronouns
   * @example 'he/him'
   */
  @ApiProperty({
    description: 'User pronouns',
    example: 'he/him',
  })
  @IsNotEmpty()
  @IsString()
  readonly pronouns: string;

  /**
   * User's email address
   * @example 'john.doe@example.com'
   */
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Please enter correct email' })
  readonly email: string;

  /**
   * User's password
   * @example 'SecurePass123!'
   */
  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'SecurePass123!',
    minLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  readonly password: string;

  /**
   * User's role in the system
   * @example 'user'
   */
  @ApiProperty({
    description: 'User role',
    enum: Role,
    example: Role.user,
  })
  @IsNotEmpty()
  @IsString()
  readonly role: Role;
}
