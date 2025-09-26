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
  ): Promise<Activity> {
    try {
      const activity = this.activityRepository.create({
        ...createActivityDto,
        createdByUserId: userId,
      });

      return await this.activityRepository.save(activity);
    } catch (error) {
      throw new HttpException(
        'Error creating activity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get All Activities ----------------- \\
  async getAllActivities(queryParams?: any): Promise<Activity[]> {
    try {
      // Build where conditions based on query parameters
      const whereConditions: any = {};

      // Handle isArchived parameter
      if (queryParams?.isArchived !== undefined) {
        whereConditions.isArchived = queryParams.isArchived === 'true';
      } else {
        // Default behavior: only show non-archived events
        whereConditions.isArchived = false;
      }

      // Always exclude hidden events
      whereConditions.isHidden = false;

      return await this.activityRepository.find({
        where: whereConditions,
        order: { eventDate: 'ASC' },
      });
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
        order: { eventDate: 'ASC' },
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

      Object.assign(activity, updateActivityDto);
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

      // Check if user owns the activity or is an admin (permission check for non-admins is done in controller)
      // Admin permissions are checked in the controller, so we don't need to check again here
      // This allows both creators and admins to archive activities

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
        .orderBy('activity.eventDate', 'ASC')
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
        order: { eventDate: 'DESC' },
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

      // Upload the file to S3 and get the URL
      const coverImageUrl = await this.s3Service.uploadFile(
        file,
        'cover-images',
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
}
