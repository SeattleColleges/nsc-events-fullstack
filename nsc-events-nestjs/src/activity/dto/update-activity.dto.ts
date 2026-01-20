import { SocialMedia } from '../entities/activity.entity';
import {
  IsArray,
  IsEmail,
  IsEmpty,
  IsISO8601,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  IsBoolean,
  ValidateIf,
  Validate,
} from 'class-validator';
import { IsAfterStartDate } from '../../../custom-validators/is-after-start-date';
import { IsSocialMedia } from '../../../custom-validators/is-social-media';
import { User } from '../../user/entities/user.entity';

export class UpdateActivityDto {
  @IsEmpty({ message: 'You cannot pass user id.' })
  readonly createdByUser: User;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  readonly eventTitle: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  readonly eventDescription: string;

  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: 'startDate must be a valid ISO 8601 datetime string' },
  )
  readonly startDate: string;

  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: 'endDate must be a valid ISO 8601 datetime string' },
  )
  @Validate(IsAfterStartDate, { message: 'endDate must be after startDate' })
  readonly endDate: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  readonly eventLocation: string;

  @IsOptional()
  @IsString()
  readonly coverPhotoId?: string;

  @IsOptional()
  @IsString()
  readonly documentId?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  readonly eventHost: string;

  @ValidateIf(
    (obj) => obj.eventMeetingURL !== undefined && obj.eventMeetingURL !== '',
  )
  @IsOptional()
  @IsUrl()
  readonly eventMeetingURL?: string;

  @IsOptional()
  @IsString()
  readonly eventRegistration?: string;

  @IsOptional()
  @IsNumberString()
  readonly eventCapacity: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly tagNames?: string[];

  @IsOptional()
  @IsString()
  readonly eventSchedule?: string;

  @IsOptional()
  @IsArray({
    message:
      "eventSpeakers must be an array. Did you mean to enter ['speaker']?",
  })
  @IsString({
    each: true,
  })
  readonly eventSpeakers?: string[];

  @IsOptional()
  @IsString()
  readonly eventPrerequisites?: string;

  @IsOptional()
  @IsString()
  readonly eventCancellationPolicy?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Be sure to enter club email or a point of contact.' })
  @IsEmail()
  readonly eventContact: string;

  @IsOptional()
  @IsSocialMedia()
  readonly eventSocialMedia: SocialMedia;

  @IsOptional()
  @IsString()
  readonly eventPrivacy?: string;

  @IsOptional()
  @IsString()
  readonly eventAccessibility?: string;

  @IsOptional()
  @IsString()
  readonly eventNote: string;

  @IsOptional()
  @IsBoolean()
  readonly isHidden: boolean;

  @IsOptional()
  @IsBoolean()
  readonly isArchived: boolean;
}
