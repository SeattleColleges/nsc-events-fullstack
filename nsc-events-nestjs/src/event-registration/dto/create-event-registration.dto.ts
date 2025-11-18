import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';
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
   * First name
   * @example 'Jane'
   */
  @ApiProperty({
    description: 'First name of the registrant',
    example: 'Jane',
  })
  @IsString()
  firstName: string;

  /**
   * Last name
   * @example 'Smith'
   */
  @ApiProperty({
    description: 'Last name of the registrant',
    example: 'Smith',
  })
  @IsString()
  lastName: string;

  /**
   * Email address
   * @example 'jane.smith@example.com'
   */
  @ApiProperty({
    description: 'Email address of the registrant',
    example: 'jane.smith@example.com',
  })
  @IsEmail()
  email: string;

  /**
   * College name
   * @example 'Harvard University'
   */
  @ApiProperty({
    description: 'College name',
    example: 'Harvard University',
  })
  @IsString()
  college: string;

  /**
   * Year of study
   * @example 'Sophomore'
   */
  @ApiProperty({
    description: 'Year of study',
    example: 'Sophomore',
  })
  @IsString()
  yearOfStudy: string;

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
  isAttended = false;
}
