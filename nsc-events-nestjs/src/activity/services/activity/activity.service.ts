import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity, Attendee } from '../../entities/activity.entity';
import { CreateActivityDto } from '../../dto/create-activity.dto';
import { UpdateActivityDto } from '../../dto/update-activity.dto';
import { Express } from 'express';
import { S3Service } from './s3.service';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    private readonly s3Service: S3Service,
  ) {}

  // ----------------- Create Activity ----------------- \\
  async createActivity(
    createActivityDto: CreateActivityDto,
    userId: string,
    coverImageFile?: Express.Multer.File,
  ): Promise<Activity> {
    let uploadedImageUrl: string | undefined;

    try {
      // Upload cover image to S3 if provided
      if (coverImageFile) {
        uploadedImageUrl = await this.s3Service.uploadFile(
          coverImageFile,
          'cover-images',
          true, // Enable resize
        );
      }

      // Convert ISO 8601 strings to Date objects
      const activityData = {
        ...createActivityDto,
        startDate: new Date(createActivityDto.startDate),
        endDate: new Date(createActivityDto.endDate),
        createdByUserId: userId,
        // Use uploaded image URL if available, otherwise use the one from DTO (empty string)
        eventCoverPhoto:
          uploadedImageUrl || createActivityDto.eventCoverPhoto || '',
        // Ensure eventSocialMedia is always an object, never null
        eventSocialMedia: createActivityDto.eventSocialMedia || {},
      };

      const activity = this.activityRepository.create(activityData);

      return await this.activityRepository.save(activity);
    } catch (error) {
      // If we uploaded an image but activity creation failed, we should delete the uploaded image
      // However, for simplicity and to avoid orphaned data in edge cases, we'll let the S3 cleanup handle it
      // In production, consider implementing a more robust cleanup mechanism

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
        .where('activity."isHidden" = false')
        .andWhere('activity."isArchived" = :isArchived', { isArchived });

      // Tag filter: activity."eventTags" is a comma-separated text field.
      // Match ANY selected tag using a case-insensitive regex with token boundaries:
      // (^|,\s*)tag(,|$)
      if (tagsArray.length > 0) {
        const orClauses: string[] = [];
        const params: Record<string, any> = {};

        tagsArray.forEach((t, i) => {
          orClauses.push(`activity."eventTags" ~* :tag${i}`);
          params[`tag${i}`] = `(^|,\\s*)${this.escapeRegex(t)}(,|$)`;
        });

        qb.andWhere(orClauses.map((c) => `(${c})`).join(' OR '), params);
      }

      // Order by startDate instead of eventDate
      qb.orderBy('activity."startDate"', 'ASC')
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
      const activity = await this.activityRepository.findOne({ where: { id } });

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
      const activity = await this.getActivityById(id);

      // Check if user owns the activity
      if (activity.createdByUserId !== userId) {
        throw new BadRequestException(
          'You can only delete your own activities',
        );
      }

      await this.activityRepository.remove(activity);
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

  // ----------------- Add Attendee ----------------- \\
  async addAttendee(activityId: string, attendee: Attendee): Promise<Activity> {
    try {
      const activity = await this.getActivityById(activityId);

      if (!activity.attendees) {
        activity.attendees = [];
      }

      // Check if attendee already exists
      const existingAttendee = activity.attendees.find(
        (a) =>
          a.firstName === attendee.firstName &&
          a.lastName === attendee.lastName,
      );

      if (existingAttendee) {
        throw new BadRequestException('Attendee already registered');
      }

      activity.attendees.push(attendee);
      activity.attendanceCount = activity.attendees.length;

      return await this.activityRepository.save(activity);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Error adding attendee',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Remove Attendee ----------------- \\
  async removeAttendee(
    activityId: string,
    attendeeIndex: number,
  ): Promise<Activity> {
    try {
      const activity = await this.getActivityById(activityId);

      if (!activity.attendees || attendeeIndex >= activity.attendees.length) {
        throw new BadRequestException('Attendee not found');
      }

      activity.attendees.splice(attendeeIndex, 1);
      activity.attendanceCount = activity.attendees.length;

      return await this.activityRepository.save(activity);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new HttpException(
        'Error removing attendee',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Search Activities ----------------- \\
  async searchActivities(searchTerm: string): Promise<Activity[]> {
    try {
      return await this.activityRepository
        .createQueryBuilder('activity')
        .where(
          'activity.isHidden = :isHidden AND activity.isArchived = :isArchived',
          {
            isHidden: false,
            isArchived: false,
          },
        )
        .andWhere(
          '(activity.eventTitle ILIKE :searchTerm OR activity.eventDescription ILIKE :searchTerm OR activity.eventLocation ILIKE :searchTerm)',
          { searchTerm: `%${searchTerm}%` },
        )
        .orderBy('activity.startDate', 'ASC')
        .getMany();
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
  ): Promise<Activity> {
    try {
      const activity = await this.activityRepository.findOne({
        where: { id: activityId },
      });

      if (!activity) {
        throw new NotFoundException(`Activity with ID ${activityId} not found`);
      }

      // Upload the file to S3 and get the URL (with resizing)
      const coverImageUrl = await this.s3Service.uploadFile(
        file,
        'cover-images',
        true, // Enable resize
      );

      activity.eventCoverPhoto = coverImageUrl;

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

  /** Escape user-provided tag text for regex safety */
  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
