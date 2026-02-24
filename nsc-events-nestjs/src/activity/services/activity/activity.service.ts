import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../../entities/activity.entity';
import { CreateActivityDto } from '../../dto/create-activity.dto';
import { UpdateActivityDto } from '../../dto/update-activity.dto';
import { Express } from 'express';
import { TagService } from '../../../tag/tag.service';
import { MediaService } from '../../../media/media.service';
import { MediaType } from '../../../media/entities/media.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    private readonly tagService: TagService,
    private readonly mediaService: MediaService,
  ) {}

  // ----------------- Create Activity ----------------- \\
  async createActivity(
    createActivityDto: CreateActivityDto,
    userId: string,
    coverImageFile?: Express.Multer.File,
  ): Promise<Activity> {
    try {
      // Handle tags - find or create Tag entities from tag names
      let tags = [];
      if (createActivityDto.tagNames && createActivityDto.tagNames.length > 0) {
        tags = await this.tagService.findOrCreateMany(
          createActivityDto.tagNames,
        );
      }

      // Upload cover image to S3 if provided and create Media record
      let coverPhotoId: string | undefined;
      if (coverImageFile) {
        const media = await this.mediaService.uploadFile(
          coverImageFile,
          userId,
          MediaType.IMAGE,
          'cover-images',
          true, // Enable resize
        );
        coverPhotoId = media.id;
      }

      // Convert ISO 8601 strings to Date objects
      const activityData = {
        ...createActivityDto,
        startDate: new Date(createActivityDto.startDate),
        endDate: new Date(createActivityDto.endDate),
        createdByUserId: userId,
        coverPhotoId: coverPhotoId || createActivityDto.coverPhotoId,
        documentId: createActivityDto.documentId,
        tags,
        // Ensure eventSocialMedia is always an object, never null
        eventSocialMedia: createActivityDto.eventSocialMedia || {},
      };

      // Remove tagNames from activity data (it's not a column)
      delete (activityData as any).tagNames;

      const activity = this.activityRepository.create(activityData);

      return await this.activityRepository.save(activity);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Log the actual error for debugging
      console.error('Error creating activity:', error);

      throw new HttpException(
        `Error creating activity: ${error.message || 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get All Activities ----------------- \\
  async getAllActivities(queryParams?: any): Promise<Activity[]> {
    try {
      // derive basic flags/pagination from incoming query-like shape
      const page = Number(queryParams?.page ?? 1);
      const take = Number(queryParams?.numberOfEventsToGet ?? 12);
      const isArchived =
        (queryParams?.isArchived ?? 'false') === 'true' ? true : false;

      // tags can arrive as an array (from controller) or comma string (direct call)
      const tagsArray: string[] = Array.isArray(queryParams?.tags)
        ? (queryParams.tags as string[])
        : String(queryParams?.tags ?? '')
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);

      // switch to QueryBuilder so we can filter by tags safely
      const qb = this.activityRepository
        .createQueryBuilder('activity')
        .leftJoinAndSelect('activity.tags', 'tag')
        .leftJoinAndSelect('activity.coverPhoto', 'coverPhoto')
        .leftJoinAndSelect('activity.document', 'document')
        .where('activity.isHidden = :isHidden', { isHidden: false })
        .andWhere('activity.isArchived = :isArchived', { isArchived });

      // Tag filter: filter by tag names using the join table
      if (tagsArray.length > 0) {
        qb.andWhere(
          `activity.id IN (
            SELECT at.activity_id FROM activity_tags at
            JOIN tags t ON at.tag_id = t.id
            WHERE LOWER(t.name) IN (:...tagNames)
          )`,
          { tagNames: tagsArray },
        );
      }

      // Location filter
      if (queryParams?.location && queryParams.location.trim()) {
        qb.andWhere('activity.eventLocation ILIKE :location', {
          location: `%${queryParams.location.trim()}%`,
        });
      }

      // Host filter
      if (queryParams?.host && queryParams.host.trim()) {
        qb.andWhere('activity.eventHost ILIKE :host', {
          host: `%${queryParams.host.trim()}%`,
        });
      }

      // Date range filters
      if (queryParams?.startDate) {
        qb.andWhere('activity.startDate >= :startDate', {
          startDate: new Date(queryParams.startDate),
        });
      }

      if (queryParams?.endDate) {
        qb.andWhere('activity.endDate <= :endDate', {
          endDate: new Date(queryParams.endDate),
        });
      }

      // Order by startDate instead of eventDate
      qb.orderBy('activity.startDate', 'ASC')
        .take(take)
        .skip((page - 1) * take);

      return await qb.getMany();
    } catch (error) {
      throw new HttpException(
        'Error retrieving activities',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get Activity by ID ----------------- \\
  async getActivityById(id: string): Promise<Activity> {
    try {
      const activity = await this.activityRepository.findOne({
        where: { id },
        relations: ['tags', 'coverPhoto', 'document'],
      });

      if (!activity) {
        throw new NotFoundException('Activity not found');
      }

      return activity;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        'Error retrieving activity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get Activities by User ID ----------------- \\
  async getActivitiesByUserId(userId: string): Promise<Activity[]> {
    try {
      return await this.activityRepository.find({
        where: {
          createdByUserId: userId,
          isHidden: false,
          isArchived: false,
        },
        order: { startDate: 'ASC' },
      });
    } catch (error) {
      throw new HttpException(
        'Error retrieving user activities',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Update Activity ----------------- \\
  async updateActivity(
    id: string,
    updateActivityDto: UpdateActivityDto,
    userId: string,
  ): Promise<Activity> {
    try {
      const activity = await this.getActivityById(id);

      // Check if user owns the activity
      if (activity.createdByUserId !== userId) {
        throw new BadRequestException(
          'You can only update your own activities',
        );
      }

      // Convert ISO 8601 strings to Date objects if provided
      const updateData: any = { ...updateActivityDto };
      if (updateActivityDto.startDate) {
        updateData.startDate = new Date(updateActivityDto.startDate);
      }
      if (updateActivityDto.endDate) {
        updateData.endDate = new Date(updateActivityDto.endDate);
      }
      // Ensure eventSocialMedia is always an object, never null
      if (updateActivityDto.eventSocialMedia !== undefined) {
        updateData.eventSocialMedia = updateActivityDto.eventSocialMedia || {};
      }

      Object.assign(activity, updateData);
      return await this.activityRepository.save(activity);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Error updating activity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Delete Activity ----------------- \\
  async deleteActivity(id: string, userId: string): Promise<void> {
    try {
      const activity = await this.activityRepository.findOne({
        where: { id },
      });

      if (!activity) {
        throw new NotFoundException('Activity not found');
      }

      // Check if user owns the activity
      if (activity.createdByUserId !== userId) {
        throw new BadRequestException(
          'You can only delete your own activities',
        );
      }

      // Store media IDs before deletion (foreign keys will be set to NULL on delete)
      const coverPhotoId = activity.coverPhotoId;
      const documentId = activity.documentId;

      // Delete the activity first
      await this.activityRepository.remove(activity);

      // Clean up associated media files from S3 and database
      // Do this after activity deletion so we don't leave orphaned references
      if (coverPhotoId) {
        try {
          await this.mediaService.delete(coverPhotoId);
        } catch (error) {
          // Log but don't fail - activity is already deleted
          console.warn(
            `Failed to delete cover photo ${coverPhotoId}: ${error.message}`,
          );
        }
      }

      if (documentId) {
        try {
          await this.mediaService.delete(documentId);
        } catch (error) {
          // Log but don't fail - activity is already deleted
          console.warn(
            `Failed to delete document ${documentId}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Error deleting activity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Hide Activity ----------------- \\
  async hideActivity(id: string, userId: string): Promise<Activity> {
    try {
      const activity = await this.getActivityById(id);

      // Check if user owns the activity
      if (activity.createdByUserId !== userId) {
        throw new BadRequestException('You can only hide your own activities');
      }

      activity.isHidden = true;
      return await this.activityRepository.save(activity);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Error hiding activity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Archive Activity ----------------- \\
  async archiveActivity(id: string): Promise<Activity> {
    try {
      const activity = await this.getActivityById(id);

      activity.isArchived = true;
      return await this.activityRepository.save(activity);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Error archiving activity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Unarchive Activity ----------------- \\
  async unarchiveActivity(id: string): Promise<Activity> {
    try {
      const activity = await this.getActivityById(id);

      activity.isArchived = false;
      return await this.activityRepository.save(activity);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Error unarchiving activity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Search Activities ----------------- \\
  async searchActivities(
    searchTerm: string,
    options?: {
      isArchived?: boolean;
      location?: string;
      host?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<Activity[]> {
    try {
      const qb = this.activityRepository
        .createQueryBuilder('activity')
        .where('activity.isHidden = :isHidden', { isHidden: false });

      // Filter by archived status (default to non-archived)
      const isArchived = options?.isArchived ?? false;
      qb.andWhere('activity.isArchived = :isArchived', { isArchived });

      // Search term filter (title, description, or location)
      if (searchTerm && searchTerm.trim()) {
        qb.andWhere(
          '(activity.eventTitle ILIKE :searchTerm OR activity.eventDescription ILIKE :searchTerm OR activity.eventLocation ILIKE :searchTerm OR activity.eventHost ILIKE :searchTerm)',
          { searchTerm: `%${searchTerm.trim()}%` },
        );
      }

      // Location filter
      if (options?.location && options.location.trim()) {
        qb.andWhere('activity.eventLocation ILIKE :location', {
          location: `%${options.location.trim()}%`,
        });
      }

      // Host filter
      if (options?.host && options.host.trim()) {
        qb.andWhere('activity.eventHost ILIKE :host', {
          host: `%${options.host.trim()}%`,
        });
      }

      // Date range filter
      if (options?.startDate) {
        qb.andWhere('activity.startDate >= :startDate', {
          startDate: new Date(options.startDate),
        });
      }

      if (options?.endDate) {
        qb.andWhere('activity.endDate <= :endDate', {
          endDate: new Date(options.endDate),
        });
      }

      return await qb.orderBy('activity.startDate', 'ASC').getMany();
    } catch (error) {
      throw new HttpException(
        'Error searching activities',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get Archived Activities ----------------- \\
  async getArchivedActivities(): Promise<Activity[]> {
    try {
      return await this.activityRepository.find({
        where: { isArchived: true },
        order: { startDate: 'DESC' },
      });
    } catch (error) {
      throw new HttpException(
        'Error retrieving archived activities',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Update Cover Image ----------------- \\
  async updateCoverImage(
    activityId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<Activity> {
    try {
      const activity = await this.activityRepository.findOne({
        where: { id: activityId },
      });

      if (!activity) {
        throw new NotFoundException(`Activity with ID ${activityId} not found`);
      }

      // Use replaceMedia to upload new and delete old cover image
      const newMedia = await this.mediaService.replaceMedia(
        activity.coverPhotoId, // Old media ID (will be deleted if exists)
        file,
        userId,
        MediaType.IMAGE,
        'cover-images',
        true, // Enable resize
      );

      activity.coverPhotoId = newMedia.id;

      return await this.activityRepository.save(activity);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new HttpException(
        'Error updating cover image',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Update Document ----------------- \\
  async updateDocument(
    activityId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<Activity> {
    try {
      const activity = await this.activityRepository.findOne({
        where: { id: activityId },
      });

      if (!activity) {
        throw new NotFoundException(`Activity with ID ${activityId} not found`);
      }

      // Use replaceMedia to upload new and delete old document
      const newMedia = await this.mediaService.replaceMedia(
        activity.documentId, // Old media ID (will be deleted if exists)
        file,
        userId,
        MediaType.DOCUMENT,
        'documents',
        false, // No resize for documents
      );

      activity.documentId = newMedia.id;

      return await this.activityRepository.save(activity);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new HttpException(
        'Error updating document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Update Tags ----------------- \\
  async updateTags(activityId: string, tagNames: string[]): Promise<Activity> {
    try {
      const activity = await this.activityRepository.findOne({
        where: { id: activityId },
        relations: ['tags'],
      });

      if (!activity) {
        throw new NotFoundException(`Activity with ID ${activityId} not found`);
      }

      // Find or create tags from the provided names
      const tags = await this.tagService.findOrCreateMany(tagNames);
      activity.tags = tags;

      return await this.activityRepository.save(activity);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new HttpException(
        'Error updating activity tags',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
