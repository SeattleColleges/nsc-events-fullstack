import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventRegistration } from '../entities/event-registration.entity';
import { CreateEventRegistrationDto } from '../dto/create-event-registration.dto';

@Injectable()
export class EventRegistrationService {
  constructor(
    @InjectRepository(EventRegistration)
    private readonly eventRegistrationRepository: Repository<EventRegistration>,
  ) {}

  // ----------------- Create Event Registration ----------------- \\
  async createEventRegistration(
    createEventRegistrationDto: CreateEventRegistrationDto,
  ): Promise<EventRegistration> {
    try {
      // Check if user already registered for this activity
      const existingRegistration =
        await this.eventRegistrationRepository.findOne({
          where: {
            activityId: createEventRegistrationDto.activityId,
            userId: createEventRegistrationDto.userId,
          },
        });

      if (existingRegistration) {
        throw new BadRequestException('User already registered for this event');
      }

      const registration = this.eventRegistrationRepository.create(
        createEventRegistrationDto,
      );
      return await this.eventRegistrationRepository.save(registration);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        'Error creating event registration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get All Event Registrations ----------------- \\
  async getAllEventRegistrations(): Promise<EventRegistration[]> {
    try {
      return await this.eventRegistrationRepository.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw new HttpException(
        'Error retrieving event registrations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get Event Registration by ID ----------------- \\
  async getEventRegistrationById(id: string): Promise<EventRegistration> {
    try {
      const registration = await this.eventRegistrationRepository.findOne({
        where: { id },
      });

      if (!registration) {
        throw new NotFoundException('Event registration not found');
      }

      return registration;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        'Error retrieving event registration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get Event Registrations by Activity ID ----------------- \\
  async getEventRegistrationsByActivityId(
    activityId: string,
  ): Promise<EventRegistration[]> {
    try {
      return await this.eventRegistrationRepository.find({
        where: { activityId },
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      throw new HttpException(
        'Error retrieving event registrations for activity',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get Event Registrations by User ID ----------------- \\
  async getEventRegistrationsByUserId(
    userId: string,
  ): Promise<EventRegistration[]> {
    try {
      return await this.eventRegistrationRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw new HttpException(
        'Error retrieving user event registrations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Update Event Registration ----------------- \\
  async updateEventRegistration(
    id: string,
    updateData: Partial<EventRegistration>,
  ): Promise<EventRegistration> {
    try {
      const registration = await this.getEventRegistrationById(id);

      Object.assign(registration, updateData);
      return await this.eventRegistrationRepository.save(registration);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new HttpException(
        'Error updating event registration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Delete Event Registration ----------------- \\
  // this is needed in other instances
  async deleteEventRegistration(id: string): Promise<void> {
    try {
      const registration = await this.getEventRegistrationById(id);
      await this.eventRegistrationRepository.remove(registration);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new HttpException(
        'Error deleting event registration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // unregisters from event using userid and event id
  async deleteByUserAndEvent(userId: string, eventId: string): Promise<void> {
    const result = await this.eventRegistrationRepository.delete({
      userId,
      activityId: eventId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Registration not found');
    }
  }

  // ----------------- Mark Attendance ----------------- \\
  async markAttendance(
    id: string,
    isAttended: boolean,
  ): Promise<EventRegistration> {
    try {
      const registration = await this.getEventRegistrationById(id);
      registration.isAttended = isAttended;
      return await this.eventRegistrationRepository.save(registration);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new HttpException(
        'Error marking attendance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get Attendees for Activity ----------------- \\
  async getAttendeesForActivity(
    activityId: string,
  ): Promise<EventRegistration[]> {
    try {
      return await this.eventRegistrationRepository.find({
        where: { activityId, isAttended: true },
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      throw new HttpException(
        'Error retrieving attendees',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- Get Registration Statistics ----------------- \\
  async getRegistrationStats(activityId: string): Promise<{
    totalRegistrations: number;
    totalAttendees: number;
    attendanceRate: number;
  }> {
    try {
      const totalRegistrations = await this.eventRegistrationRepository.count({
        where: { activityId },
      });

      const totalAttendees = await this.eventRegistrationRepository.count({
        where: { activityId, isAttended: true },
      });

      const attendanceRate =
        totalRegistrations > 0
          ? (totalAttendees / totalRegistrations) * 100
          : 0;

      return {
        totalRegistrations,
        totalAttendees,
        attendanceRate: Math.round(attendanceRate * 100) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      throw new HttpException(
        'Error retrieving registration statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
