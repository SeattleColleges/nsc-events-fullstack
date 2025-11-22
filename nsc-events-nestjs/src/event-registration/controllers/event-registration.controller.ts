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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Event Registration')
@Controller('event-registration')
export class EventRegistrationController {
  private readonly logger = new Logger(EventRegistrationController.name);

  constructor(
    private readonly registrationService: EventRegistrationService,
    private readonly activityService: ActivityService, // Inject ActivityService
  ) {}

  // Register a user for an event
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('register')
  @ApiOperation({
    summary: 'Register user for an event',
    description: 'Creates a new event registration for a user',
  })
  @ApiBody({ type: CreateEventRegistrationDto })
  @ApiResponse({
    status: 201,
    description: 'Successfully registered for event',
    type: EventRegistration,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async registerForEvent(
    @Body() createRegistrationDto: CreateEventRegistrationDto,
  ): Promise<EventRegistration> {
    return this.registrationService.createEventRegistration(
      createRegistrationDto,
    );
  }

  // New endpoint for attending an event
  @Post('attend')
  @ApiOperation({
    summary: 'Attend an event',
    description: 'Quick registration for event attendance',
  })
  @ApiBody({ type: AttendEventDto })
  @ApiResponse({
    status: 201,
    description: 'Successfully attended event',
    type: EventRegistration,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Error attending event' })
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
  @ApiOperation({
    summary: 'Get event registrations',
    description: 'Retrieves all registrations for a specific event',
  })
  @ApiParam({ name: 'activityId', description: 'Event/Activity ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Event registration details with attendee information',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 25 },
        anonymousCount: { type: 'number', example: 0 },
        attendees: { type: 'array', items: { type: 'object' } },
        attendeeNames: {
          type: 'array',
          items: { type: 'string' },
          example: ['John Doe', 'Jane Smith'],
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
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
  @ApiBearerAuth('JWT-auth')
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get user registrations',
    description: 'Retrieves all events a user is registered for',
  })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'List of events user is registered for',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          eventTitle: { type: 'string' },
          eventDate: { type: 'string', format: 'date-time' },
          eventStartTime: { type: 'string', example: '2:00PM' },
          eventEndTime: { type: 'string', example: '4:00PM' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          registrationId: { type: 'string' },
          isAttended: { type: 'boolean' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
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

      // Extract date and time from the new timestamp fields
      const startDate = event.startDate
        ? new Date(event.startDate)
        : new Date('1970-01-01');
      const endDate = event.endDate ? new Date(event.endDate) : null;

      // Format time for display (you can adjust format as needed)
      const formatTime = (date: Date): string => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        return `${displayHours}:${displayMinutes}${ampm}`;
      };

      validEvents.push({
        eventId: event.id,
        eventTitle: event.eventTitle || 'Untitled Event',
        eventDate: startDate, // Using startDate as the event date
        eventStartTime: formatTime(startDate), // Format start time from ISO
        eventEndTime: endDate ? formatTime(endDate) : 'TBA', // Format end time if available
        startDate: event.startDate, // Include full ISO timestamp if needed
        endDate: event.endDate, // Include full ISO timestamp if needed
        registrationId: registration.id,
        isAttended: registration.isAttended,
      });
    }

    return validEvents;
  }

  // Check if user is registered for an event (alias for frontend compatibility)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('check/:activityId/:userId')
  @ApiOperation({
    summary: 'Check if user is registered',
    description: 'Checks if a user is registered for a specific event',
  })
  @ApiParam({ name: 'activityId', description: 'Event/Activity ID (UUID)' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Registration status',
    schema: {
      type: 'object',
      properties: {
        isRegistered: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiBearerAuth('JWT-auth')
  @Get('is-attending/:activityId/:userId')
  @ApiOperation({
    summary: 'Check if user is attending',
    description: 'Checks if a user is attending a specific event',
  })
  @ApiParam({ name: 'activityId', description: 'Event/Activity ID (UUID)' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Attendance status',
    schema: {
      type: 'boolean',
      example: true,
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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

  // Unregister from an event - is this needed?
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete('unregister/:id')
  @ApiOperation({
    summary: 'Unregister from event by registration ID',
    description: 'Removes a registration using the registration ID',
  })
  @ApiParam({ name: 'id', description: 'Registration ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Successfully unregistered',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Successfully unregistered from event',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async unregisterFromEvent(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.registrationService.deleteEventRegistration(id);
    return { message: 'Successfully unregistered from event' };
  }

  // Unregister from an event
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete('unattend')
  @ApiOperation({
    summary: 'Unregister from event',
    description: 'Removes a registration using user ID and event ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          example: 'u1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
        eventId: {
          type: 'string',
          example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
      },
      required: ['userId', 'eventId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully unregistered',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Successfully unregistered from event',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async unattendEvent(
    @Body() body: { userId: string; eventId: string },
  ): Promise<{ message: string }> {
    const { userId, eventId } = body;
    await this.registrationService.deleteByUserAndEvent(userId, eventId);
    return { message: 'Successfully unregistered from event' };
  }

  // Mark attendance for a registration
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch('attendance/:id')
  @ApiOperation({
    summary: 'Mark attendance',
    description: 'Updates the attendance status for a registration',
  })
  @ApiParam({ name: 'id', description: 'Registration ID (UUID)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isAttended: { type: 'boolean', example: true },
      },
      required: ['isAttended'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Attendance updated',
    type: EventRegistration,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async markAttendance(
    @Param('id') id: string,
    @Body() body: { isAttended: boolean },
  ): Promise<EventRegistration> {
    return this.registrationService.markAttendance(id, body.isAttended);
  }

  // Get attendees for an event
  @Get('attendees/:activityId')
  @ApiOperation({
    summary: 'Get event attendees',
    description:
      'Retrieves all attendees who have marked attendance for an event',
  })
  @ApiParam({ name: 'activityId', description: 'Event/Activity ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'List of attendees',
    type: [EventRegistration],
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getAttendeesForEvent(
    @Param('activityId') activityId: string,
  ): Promise<EventRegistration[]> {
    return this.registrationService.getAttendeesForActivity(activityId);
  }

  // Get registration statistics for an event
  @Get('stats/:activityId')
  @ApiOperation({
    summary: 'Get registration statistics',
    description:
      'Retrieves registration and attendance statistics for an event',
  })
  @ApiParam({ name: 'activityId', description: 'Event/Activity ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Event statistics',
    schema: {
      type: 'object',
      properties: {
        totalRegistrations: { type: 'number', example: 50 },
        totalAttendees: { type: 'number', example: 45 },
        attendanceRate: { type: 'number', example: 0.9 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getRegistrationStats(@Param('activityId') activityId: string): Promise<{
    totalRegistrations: number;
    totalAttendees: number;
    attendanceRate: number;
  }> {
    return this.registrationService.getRegistrationStats(activityId);
  }
}
