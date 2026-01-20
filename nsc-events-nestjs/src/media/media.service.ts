import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import * as sharp from 'sharp';
import { Media, MediaType } from './entities/media.entity';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  private readonly bucketName: string;
  private readonly s3Client: S3Client;

  private readonly allowedImageMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
  ];

  private readonly allowedDocumentMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  /**
   * Resize image to maximum dimensions
   */
  private async resizeImage(
    buffer: Buffer,
    maxWidth = 1920,
    maxHeight = 1080,
  ): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      throw new Error(`Failed to resize image: ${error.message}`);
    }
  }

  /**
   * Upload a file to S3 and create a Media record.
   * Includes rollback mechanism - if database save fails, S3 file is deleted.
   */
  async uploadFile(
    file: Express.Multer.File,
    uploadedByUserId: string,
    type: MediaType = MediaType.IMAGE,
    folder = 'uploads',
    resize = false,
  ): Promise<Media> {
    // Validate file size
    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds the maximum limit of ${
          this.MAX_FILE_SIZE_BYTES / 1024 / 1024
        } MB.`,
      );
    }

    // Validate file type based on media type
    const allowedTypes =
      type === MediaType.IMAGE
        ? this.allowedImageMimeTypes
        : this.allowedDocumentMimeTypes;

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type for ${type}. Allowed types: ${allowedTypes.join(
          ', ',
        )}`,
      );
    }

    let s3Key: string | null = null;

    try {
      // Resize image if requested and it's an image type
      let fileBuffer = file.buffer;
      if (resize && type === MediaType.IMAGE) {
        fileBuffer = await this.resizeImage(file.buffer);
      }

      // Create unique filename
      const filename = `${Date.now()}-${file.originalname}`;
      s3Key = `${folder}/${filename}`;

      // Upload to S3
      const uploadParams = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: file.mimetype,
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      // Generate public URL
      const region = this.configService.get<string>('AWS_REGION');
      let s3Url: string;

      if (region === 'us-east-1') {
        s3Url = `https://${this.bucketName}.s3.amazonaws.com/${s3Key}`;
      } else {
        s3Url = `https://${this.bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
      }

      // Create Media record
      const media = this.mediaRepository.create({
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: fileBuffer.length,
        s3Key,
        s3Url,
        type,
        uploadedByUserId,
      });

      return await this.mediaRepository.save(media);
    } catch (error) {
      // Rollback: Delete from S3 if upload succeeded but database save failed
      if (s3Key) {
        await this.deleteFromS3(s3Key).catch((s3Error) => {
          this.logger.error(
            `Failed to rollback S3 upload for key ${s3Key}: ${s3Error.message}`,
          );
        });
      }

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        `Error uploading file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a media record by ID
   */
  async findById(id: string): Promise<Media> {
    try {
      const media = await this.mediaRepository.findOne({ where: { id } });
      if (!media) {
        throw new NotFoundException(`Media with ID ${id} not found`);
      }
      return media;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        'Error retrieving media',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find all media records
   */
  async findAll(): Promise<Media[]> {
    try {
      return await this.mediaRepository.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw new HttpException(
        'Error retrieving media',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find media by type
   */
  async findByType(type: MediaType): Promise<Media[]> {
    try {
      return await this.mediaRepository.find({
        where: { type },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw new HttpException(
        'Error retrieving media',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a media record and its S3 file
   */
  async delete(id: string): Promise<void> {
    try {
      const media = await this.findById(id);

      // Delete from S3 first
      await this.deleteFromS3(media.s3Key);

      // Delete from database
      await this.mediaRepository.remove(media);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        'Error deleting media',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a file from S3 by its key.
   * This is a low-level method that doesn't touch the database.
   */
  async deleteFromS3(s3Key: string): Promise<void> {
    try {
      const deleteParams = {
        Bucket: this.bucketName,
        Key: s3Key,
      };

      const command = new DeleteObjectCommand(deleteParams);
      await this.s3Client.send(command);
      this.logger.log(`Deleted S3 object: ${s3Key}`);
    } catch (error) {
      // S3 DeleteObject doesn't throw if object doesn't exist, but log other errors
      this.logger.error(
        `Failed to delete S3 object ${s3Key}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Check if a file exists in S3
   */
  async existsInS3(s3Key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete multiple media records and their S3 files by IDs.
   * Useful for batch cleanup operations.
   */
  async deleteMany(
    ids: string[],
  ): Promise<{ deleted: number; failed: string[] }> {
    const failed: string[] = [];
    let deleted = 0;

    for (const id of ids) {
      try {
        await this.delete(id);
        deleted++;
      } catch (error) {
        this.logger.error(`Failed to delete media ${id}: ${error.message}`);
        failed.push(id);
      }
    }

    return { deleted, failed };
  }

  /**
   * Find orphaned media records (media not referenced by any activity).
   * Useful for cleanup operations.
   */
  async findOrphanedMedia(): Promise<Media[]> {
    try {
      // Find media that is not referenced as coverPhoto or document by any activity
      const orphaned = await this.mediaRepository
        .createQueryBuilder('media')
        .leftJoin(
          'activities',
          'coverActivity',
          'coverActivity.cover_photo_id = media.id',
        )
        .leftJoin(
          'activities',
          'docActivity',
          'docActivity.document_id = media.id',
        )
        .where('coverActivity.id IS NULL')
        .andWhere('docActivity.id IS NULL')
        .getMany();

      return orphaned;
    } catch (error) {
      this.logger.error(`Error finding orphaned media: ${error.message}`);
      throw new HttpException(
        'Error finding orphaned media',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Clean up orphaned media records and their S3 files.
   * Returns the count of deleted records.
   */
  async cleanupOrphanedMedia(): Promise<{ deleted: number; failed: string[] }> {
    try {
      const orphaned = await this.findOrphanedMedia();

      if (orphaned.length === 0) {
        this.logger.log('No orphaned media found');
        return { deleted: 0, failed: [] };
      }

      this.logger.log(
        `Found ${orphaned.length} orphaned media records to clean up`,
      );

      const result = await this.deleteMany(orphaned.map((m) => m.id));

      this.logger.log(
        `Cleanup complete: ${result.deleted} deleted, ${result.failed.length} failed`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error during orphaned media cleanup: ${error.message}`,
      );
      throw new HttpException(
        'Error cleaning up orphaned media',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete the old media when replacing (e.g., when updating cover image).
   * Safely handles the case where old media doesn't exist.
   */
  async replaceMedia(
    oldMediaId: string | null | undefined,
    file: Express.Multer.File,
    uploadedByUserId: string,
    type: MediaType,
    folder: string,
    resize = false,
  ): Promise<Media> {
    // Upload new media first
    const newMedia = await this.uploadFile(
      file,
      uploadedByUserId,
      type,
      folder,
      resize,
    );

    // Delete old media if it exists
    if (oldMediaId) {
      try {
        await this.delete(oldMediaId);
        this.logger.log(
          `Replaced media: deleted old ${oldMediaId}, created new ${newMedia.id}`,
        );
      } catch (error) {
        // Log but don't fail - the new media is already uploaded
        this.logger.warn(
          `Failed to delete old media ${oldMediaId} during replacement: ${error.message}`,
        );
      }
    }

    return newMedia;
  }
}
