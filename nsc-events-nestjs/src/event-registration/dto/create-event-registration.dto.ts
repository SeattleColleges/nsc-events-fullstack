import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventRegistrationDto {
  /**
   * Activity/Event ID
   * @example 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   */
  @ApiProperty({
    description: 'ID of the event/activity to register for',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  activityId: string;

  /**
   * User ID
   * @example 'u1b2c3d4-e5f6-7890-abcd-ef1234567890'
   */
  @ApiProperty({
    description: 'ID of the user registering for the event',
    example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  userId: string;

  /**
   * College name (optional, registration-specific)
   * @example 'North Seattle College'
   */
  @ApiProperty({
    description: 'College name (optional)',
    example: 'North Seattle College',
    required: false,
  })
  @IsString()
  @IsOptional()
  college?: string;

  /**
   * Year of study (optional, registration-specific)
   * @example 'Sophomore'
   */
  @ApiProperty({
    description: 'Year of study (optional)',
    example: 'Sophomore',
    required: false,
  })
  @IsString()
  @IsOptional()
  yearOfStudy?: string;

  /**
   * Attendance status
   * @example false
   */
  @ApiProperty({
    description: 'Whether the user has attended the event',
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isAttended?: boolean = false;
}
