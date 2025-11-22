import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AttendEventDto {
  /**
   * Event ID
   * @example 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   */
  @ApiProperty({
    description: 'ID of the event to attend',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsUUID()
  readonly eventId: string;

  /**
   * User ID
   * @example 'u1b2c3d4-e5f6-7890-abcd-ef1234567890'
   */
  @ApiProperty({
    description: 'ID of the user attending the event',
    example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsUUID()
  readonly userId: string;

  /**
   * First name (optional)
   * @example 'Jane'
   */
  @ApiProperty({
    description: 'First name of the attendee',
    example: 'Jane',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly firstName?: string;

  /**
   * Last name (optional)
   * @example 'Smith'
   */
  @ApiProperty({
    description: 'Last name of the attendee',
    example: 'Smith',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly lastName?: string;

  /**
   * Referral sources (optional)
   * @example ['Instagram', 'Friend']
   */
  @ApiProperty({
    description: 'Sources that referred the user to this event',
    example: ['Instagram', 'Friend'],
    required: false,
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  readonly referralSources?: string[];
}
