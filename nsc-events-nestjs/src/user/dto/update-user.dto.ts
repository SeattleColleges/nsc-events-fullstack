import { IsEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '../entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  /**
   * First name
   * @example 'John'
   */
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly firstName: string;

  /**
   * Last name
   * @example 'Doe'
   */
  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly lastName: string;

  /**
   * Pronouns
   * @example 'they/them'
   */
  @ApiProperty({
    description: 'User pronouns',
    example: 'they/them',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly pronouns: string;

  @ApiProperty({
    description: 'Email (cannot be updated through this endpoint)',
    required: false,
  })
  @IsOptional()
  @IsEmpty({ message: 'Cannot update email here' })
  readonly email: string;

  @ApiProperty({
    description: 'Password (cannot be updated through this endpoint)',
    required: false,
  })
  @IsOptional()
  @IsEmpty({ message: 'Cannot update password here' })
  readonly password: string;

  /**
   * User role
   * @example 'creator'
   */
  @ApiProperty({
    description: 'User role',
    enum: Role,
    example: Role.creator,
    required: false,
  })
  @IsOptional()
  @IsEnum(Role)
  readonly role: Role;

  @ApiProperty({
    description: 'Google ID (for OAuth)',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly googleId: string;

  @ApiProperty({
    description: 'Google email (for OAuth)',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly googleEmail: string;

  @ApiProperty({
    description: 'Google access token (for OAuth)',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly googleAccessToken: string;

  @ApiProperty({
    description: 'Google refresh token (for OAuth)',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly googleRefreshToken: string;

  @ApiProperty({
    description: 'Google token expiry (for OAuth)',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly googleTokenExpiry: string;
}
