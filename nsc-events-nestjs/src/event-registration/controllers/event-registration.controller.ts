import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  UseGuards,
  Patch,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { EventRegistrationService } from '../services/event-registration.service';
import { CreateEventRegistrationDto } from '../dto/create-event-registration.dto';
import { AttendEventDto } from '../dto/attend-event.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EventRegistration } from '../entities/event-registration.entity';
import { ActivityService } from '../../activity/services/activity/activity.service';

@Controller('event-registration')
export class EventRegistrationController {
  private readonly logger = new Logger(EventRegistrationController.name);

  constructor(
    private readonly registrationService: EventRegistrationService,
    private readonly activityService: ActivityService, // Inject ActivityService
  ) {}

  // Register a user for an event
  @UseGuards(JwtAuthGuard)
  @Post('register')
  async registerForEvent(
    @Body() createRegistrationDto: CreateEventRegistrationDto,
  ): Promise<EventRegistration> {
    return this.registrationService.createEventRegistration(
      createRegistrationDto,
    );
  }

  // New endpoint for attending an event
  @Post('attend')
  async attendEvent(
    @Body() attendDto: AttendEventDto,
  ): Promise<EventRegistration> {
    try {
      // Create registration data from the attend DTO
      const registrationDto: CreateEventRegistrationDto = {
        activityId: attendDto.eventId,
        userId: attendDto.userId,
        firstName: attendDto.firstName || '',
        lastName: attendDto.lastName || '',
        email: '', // This would ideally be fetched from the user service
        college: '',
        yearOfStudy: '',
        isAttended: true, // Mark as attended automatically
      };

      return await this.registrationService.createEventRegistration(
        registrationDto,
      );
    } catch (error) {
      throw new HttpException(
        'Error attending event',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get all registrations for an event
  @Get('event/:activityId')
  async getRegistrationsForEvent(
    @Param('activityId') activityId: string,
  ): Promise<{
    count: number;
    anonymousCount: number;
    attendees: EventRegistration[];
    attendeeNames: string[];
  }> {
    const registrations =
      await this.registrationService.getEventRegistrationsByActivityId(
        activityId,
      );
    // Always return counts for all users
    const count = registrations.length;
    // Since we don't have an isAnonymous field, we'll set anonymousCount to 0
    const anonymousCount = 0;

    // Generate attendee names from firstName and lastName
    const attendeeNames = registrations.map((reg) => {
      // If both firstName and lastName are empty or null, return "Anonymous"
      if (
        (!reg.firstName || reg.firstName.trim() === '') &&
        (!reg.lastName || reg.lastName.trim() === '')
      ) {
        return 'Anonymous';
      }
      // Otherwise, return the concatenated name
      return `${reg.firstName || ''} ${reg.lastName || ''}`.trim();
    });

    return {
      count,
      anonymousCount,
      attendees: registrations,
      attendeeNames,
    };
  }

  // Get all events a user is registered for (fetch real event details)
  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  async getEventsForUser(@Param('userId') userId: string): Promise<any[]> {
    const registrations =
      await this.registrationService.getEventRegistrationsByUserId(userId);

    const validEvents = [];

    for (const registration of registrations) {
      const event = await this.activityService.getActivityById(
        registration.activityId,
      );

      if (!event) {
        // Log orphaned registration
        this.logger.warn(
          `Orphaned registration found for activityId=${registration.activityId}, userId=${userId}`,
        );

        // Auto-cleanup orphaned registration
        await this.registrationService.deleteEventRegistration(registration.id);
        continue; // Skip adding it to the list
      }

      validEvents.push({
        eventId: event.id,
        eventTitle: event.eventTitle || 'Untitled Event',
        eventDate: event.eventDate || new Date('1970-01-01'), // Temporary fallback
        eventStartTime: event.eventStartTime || 'TBA', // Optional fallback
        registrationId: registration.id,
        isAttended: registration.isAttended,
      });
    }

    return validEvents;
  }

  // Check if user is registered for an event (alias for frontend compatibility)
  @UseGuards(JwtAuthGuard)
  @Get('check/:activityId/:userId')
  async isUserRegistered(
    @Param('activityId') activityId: string,
    @Param('userId') userId: string,
  ): Promise<{ isRegistered: boolean }> {
    const registrations =
      await this.registrationService.getEventRegistrationsByActivityId(
        activityId,
      );
    const isRegistered = registrations.some((reg) => reg.userId === userId);
    return { isRegistered };
  }

  // Check if user is attending an event (alias for frontend compatability)
  @UseGuards(JwtAuthGuard)
  @Get('is-attending/:activityId/:userId')
  async isUserAttending(
    @Param('activityId') activityId: string,
    @Param('userId') userId: string,
  ): Promise<boolean> {
    const registrations =
      await this.registrationService.getEventRegistrationsByActivityId(
        activityId,
      );
    const isAttending = registrations.some((reg) => reg.userId === userId);
    return isAttending;
  }

  // Unregister from an event
  @UseGuards(JwtAuthGuard)
  @Delete('unregister/:id')
  async unregisterFromEvent(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.registrationService.deleteEventRegistration(id);
    return { message: 'Successfully unregistered from event' };
  }

  // Mark attendance for a registration
  @UseGuards(JwtAuthGuard)
  @Patch('attendance/:id')
  async markAttendance(
    @Param('id') id: string,
    @Body() body: { isAttended: boolean },
  ): Promise<EventRegistration> {
    return this.registrationService.markAttendance(id, body.isAttended);
  }

  // Get attendees for an event
  @Get('attendees/:activityId')
  async getAttendeesForEvent(
    @Param('activityId') activityId: string,
  ): Promise<EventRegistration[]> {
    return this.registrationService.getAttendeesForActivity(activityId);
  }

  // Get registration statistics for an event
  @Get('stats/:activityId')
  async getRegistrationStats(@Param('activityId') activityId: string): Promise<{
    totalRegistrations: number;
    totalAttendees: number;
    attendanceRate: number;
  }> {
    return this.registrationService.getRegistrationStats(activityId);
  }
}
