import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MediaType } from '../entities/media.entity';

export class UploadMediaDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File to upload',
  })
  file: Express.Multer.File;

  @ApiProperty({
    enum: MediaType,
    description: 'Type of media (image or document)',
    required: false,
    default: MediaType.IMAGE,
  })
  @IsEnum(MediaType)
  @IsOptional()
  type?: MediaType = MediaType.IMAGE;
}
