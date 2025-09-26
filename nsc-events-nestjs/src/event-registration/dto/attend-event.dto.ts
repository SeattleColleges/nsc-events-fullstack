import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AttendEventDto {
  @IsNotEmpty()
  @IsUUID()
  readonly eventId: string;

  @IsNotEmpty()
  @IsUUID()
  readonly userId: string;

  @IsOptional()
  @IsString()
  readonly firstName?: string;

  @IsOptional()
  @IsString()
  readonly lastName?: string;

  @IsOptional()
  @IsArray()
  readonly referralSources?: string[];
}
