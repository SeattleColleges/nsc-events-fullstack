import { SocialMedia } from '../entities/activity.entity';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEmpty,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  IsBoolean,
  ValidateIf,
  IsISO8601,
  Validate,
} from 'class-validator';
import { IsAfterStartDate } from '../../../custom-validators/is-after-start-date';
import { IsSocialMedia } from '../../../custom-validators/is-social-media';
import { User } from '../../user/entities/user.entity';

export class CreateActivityDto {
  @IsEmpty({ message: 'You cannot pass user id.' })
  readonly createdByUser: User;

  @IsNotEmpty()
  @IsString()
  readonly eventTitle: string;

  @IsNotEmpty()
  @IsString()
  readonly eventDescription: string;

  @IsNotEmpty()
  @IsISO8601(
    { strict: true },
    { message: 'startDate must be a valid ISO 8601 datetime string' },
  )
  readonly startDate: string;

  @IsNotEmpty()
  @IsISO8601(
    { strict: true },
    { message: 'endDate must be a valid ISO 8601 datetime string' },
  )
  @Validate(IsAfterStartDate, { message: 'endDate must be after startDate' })
  readonly endDate: string;

  @IsNotEmpty()
  @IsString()
  readonly eventLocation: string;

  @ValidateIf(
    (obj) => obj.eventCoverPhoto !== undefined && obj.eventCoverPhoto !== '',
  )
  @IsUrl() // TODO: look into options to ensure it has a https prefix
  readonly eventCoverPhoto?: string;

  @ValidateIf(
    (obj) => obj.eventDocument !== undefined && obj.eventDocument !== '',
  )
  @IsUrl()
  readonly eventDocument?: string;

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

  @IsNotEmpty()
  @IsNumberString()
  readonly eventCapacity: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  readonly eventTags: string[];

  @IsOptional()
  @IsString()
  readonly eventSchedule?: string;

  @IsOptional()
  @IsArray({
    message:
      "eventSpeakers must be an array. Did you mean to enter ['speaker']?",
  })
  @IsOptional()
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

  @IsNotEmpty({ message: 'Be sure to enter club email or a point of contact.' })
  @IsEmail()
  readonly eventContact: string;

  @IsOptional()
  @IsSocialMedia()
  readonly eventSocialMedia?: SocialMedia;

  @IsOptional()
  @IsString()
  readonly eventPrivacy?: string;

  @IsOptional()
  @IsString()
  readonly eventAccessibility?: string;

  @IsOptional()
  @IsString()
  readonly eventNote?: string;

  @IsOptional()
  @IsBoolean()
  readonly isHidden: boolean;

  @IsOptional()
  @IsBoolean()
  readonly isArchived: boolean;
}
