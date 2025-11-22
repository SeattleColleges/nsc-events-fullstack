import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  /**
   * Current password
   * @example 'OldPassword123!'
   */
  @ApiProperty({
    description: 'Current password',
    example: 'OldPassword123!',
  })
  @IsNotEmpty()
  @IsString()
  readonly currentPassword: string;

  /**
   * New password
   * @example 'NewPassword123!'
   */
  @ApiProperty({
    description: 'New password',
    example: 'NewPassword123!',
  })
  @IsNotEmpty()
  @IsString()
  readonly newPassword: string;

  /**
   * New password confirmation
   * @example 'NewPassword123!'
   */
  @ApiProperty({
    description: 'New password confirmation (must match new password)',
    example: 'NewPassword123!',
    minLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  readonly newPasswordConfirm: string;
}
