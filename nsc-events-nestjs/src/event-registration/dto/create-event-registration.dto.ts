import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';

export class CreateEventRegistrationDto {
  @IsString()
  activityId: string;

  @IsString()
  userId: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  college: string;

  @IsString()
  yearOfStudy: string;

  @IsBoolean()
  @IsOptional()
  isAttended = false;
}
