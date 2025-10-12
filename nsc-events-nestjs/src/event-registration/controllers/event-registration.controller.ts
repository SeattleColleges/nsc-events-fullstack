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
import { ActivityService } from '../../activity/services/activity/activity.service'; // ✅ fixed import path if needed

@Controller('event-registration')
export class EventRegistrationController {
  private readonly logger = new Logger(EventRegistrationController.name);

  constructor(
    private readonly registrationService: EventRegistrationService,
    private readonly activityService: ActivityService, // ✅ Inject ActivityService
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

  // Attend an event (auto-mark attended)
  @Post('attend')
  async attendEvent(
    @Body() attendDto: AttendEventDto,
  ): Promise<EventRegistration> {
    try {
      const registrationDto: CreateEventRegistrationDto = {
        activityId: attendDto.eventId,
        userId: attendDto.userId,
        firstName: attendDto.firstName || '',
        lastName: attendDto.lastName || '',
        email: '',
        college: '',
        yearOfStudy: '',
        isAttended: true,
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

    const count = registrations.length;
    const anonymousCount = 0;

    const attendeeNames = registrations.map((reg) => {
      if (
        (!reg.firstName || reg.firstName.trim() === '') &&
        (!reg.lastName || reg.lastName.trim() === '')
      ) {
        return 'Anonymous';
      }
      return `${reg.firstName || ''} ${reg.lastName || ''}`.trim();
    });

    return {
      count,
      anonymousCount,
      attendees: registrations,
      attendeeNames,
    };
  }

  // ✅ FIXED: Get all events a user is registered for (fetch real event details)
  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  async getEventsForUser(@Param('userId') userId: string): Promise<any[]> {
    const registrations =
      await this.registrationService.getEventRegistrationsByUserId(userId);

    const validEvents = [];

    for (const registration of registrations) {
      const event = await this.activityService.getActivityById(registration.activityId);

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

  // Check if user is registered for an event
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

  // Check if user is attending an event
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

  // Mark attendance
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

  // Get registration stats
  @Get('stats/:activityId')
  async getRegistrationStats(@Param('activityId') activityId: string): Promise<{
    totalRegistrations: number;
    totalAttendees: number;
    attendanceRate: number;
  }> {
    return this.registrationService.getRegistrationStats(activityId);
  }
}
