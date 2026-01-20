import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ActivityService } from '../../../activity/services/activity/activity.service';
import { Activity } from '../../entities/activity.entity';
import { CreateActivityDto } from '../../dto/create-activity.dto';
import { UpdateActivityDto } from '../../dto/update-activity.dto';
import { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '../../../user/entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('Events')
@Controller('events') // final path is /api/events (global prefix 'api')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // LIST with optional tag filtering: ?tags=club,study
  @Get('')
  @ApiOperation({
    summary: 'Get all events',
    description: 'Retrieves all events with optional pagination and filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: '1',
  })
  @ApiQuery({
    name: 'numberOfEventsToGet',
    required: false,
    description: 'Number of events per page (alias: numEvents)',
    example: '12',
  })
  @ApiQuery({
    name: 'numEvents',
    required: false,
    description: 'Number of events per page (alias for numberOfEventsToGet)',
    example: '12',
  })
  @ApiQuery({
    name: 'isArchived',
    required: false,
    description: 'Filter by archived status',
    example: 'false',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Filter by tags (comma-separated)',
    example: 'club,study',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location (partial match)',
    example: 'Seattle',
  })
  @ApiQuery({
    name: 'host',
    required: false,
    description: 'Filter by host (partial match)',
    example: 'NSC',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter events starting from this date (ISO 8601)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter events ending before this date (ISO 8601)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'List of events',
    type: [Activity],
  })
  async getAllActivities(
    @Query('page') page = '1',
    @Query('numberOfEventsToGet') numberOfEventsToGet?: string,
    @Query('numEvents') numEvents?: string,
    @Query('isArchived') isArchived = 'false',
    @Query('tags') tagsParam?: string,
    @Query('location') location?: string,
    @Query('host') host?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<Activity[]> {
    // Support both parameter names for backward compatibility
    const take = numberOfEventsToGet || numEvents || '12';

    const tags = (tagsParam ?? '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    // Keep the service signature flexible by passing an object of query-like params
    return await this.activityService.getAllActivities({
      page,
      numberOfEventsToGet: take,
      isArchived,
      tags, // array of normalized tags
      location,
      host,
      startDate,
      endDate,
    });
  }

  @Get('find/:id')
  @ApiOperation({
    summary: 'Get event by ID',
    description: 'Retrieves a specific event by its ID',
  })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Event details',
    type: Activity,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findActivityById(@Param('id') id: string): Promise<Activity> {
    return this.activityService.getActivityById(id);
  }

  // request all events created by a specific user
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get events by user',
    description: 'Retrieves all events created by a specific user',
  })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'List of events created by the user',
    type: [Activity],
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getActivitiesByUserId(
    @Param('userId') userId: string,
  ): Promise<Activity[]> {
    return this.activityService.getActivitiesByUserId(userId);
  }

  // NOTE: Event attendance is handled by the EventRegistrationController
  // Use /api/event-registration/attend instead

  @Post('new')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('coverImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create new event',
    description:
      'Creates a new event (requires creator or admin role). Supports file upload for cover image.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventTitle: { type: 'string', example: 'Tech Workshop 2025' },
        eventDescription: {
          type: 'string',
          example: 'A workshop on modern web technologies',
        },
        startDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-12-01T14:00:00Z',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-12-01T16:00:00Z',
        },
        eventLocation: {
          type: 'string',
          example: 'Room 101, Engineering Building',
        },
        eventHost: { type: 'string', example: 'Computer Science Club' },
        eventCapacity: { type: 'string', example: '50' },
        tagNames: {
          type: 'string',
          example: 'Technology, Workshop',
          description:
            'Tags - accepts comma-separated (e.g., "Tech, Workshop"), JSON array (e.g., ["Tech","Workshop"]), or single tag (e.g., "Tech")',
        },
        eventContact: {
          type: 'string',
          format: 'email',
          example: 'contact@club.com',
        },
        coverImage: {
          type: 'string',
          format: 'binary',
          description: 'Cover image file (optional)',
        },
        eventMeetingURL: {
          type: 'string',
          example: 'https://zoom.us/j/123456',
        },
        eventSpeakers: {
          type: 'string',
          example: 'Dr. Smith, Prof. Johnson',
          description:
            'Speaker names - accepts comma-separated (e.g., "Dr. Smith, Prof. Johnson") or JSON array (e.g., ["Dr. Smith","Prof. Johnson"]) (optional)',
        },
        eventSchedule: {
          type: 'string',
          example: '9:00 AM - Registration, 10:00 AM - Keynote',
        },
        eventPrerequisites: {
          type: 'string',
          example: 'Basic programming knowledge',
        },
        eventCancellationPolicy: {
          type: 'string',
          example: 'Full refund if cancelled 24h before',
        },
        eventSocialMedia: {
          type: 'string',
          example: '{"twitter":"@example","instagram":"example"}',
          description: 'JSON object with social media links (optional)',
        },
        eventPrivacy: { type: 'string', example: 'Public' },
        eventAccessibility: {
          type: 'string',
          example: 'Wheelchair accessible',
        },
        eventNote: { type: 'string', example: 'Bring your laptop' },
        isHidden: { type: 'boolean', example: false },
        isArchived: { type: 'boolean', example: false },
      },
      required: [
        'eventTitle',
        'eventDescription',
        'startDate',
        'endDate',
        'eventLocation',
        'eventHost',
        'eventCapacity',
        'eventContact',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Event successfully created',
    type: Activity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - requires creator or admin role',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async addEvent(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<Activity> {
    if (req.user.role != Role.user) {
      // Helper function to safely parse JSON fields
      const safeJsonParse = (value: any, fallback: any = null) => {
        if (!value || value === '') return fallback;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (error) {
            throw new BadRequestException(`Invalid JSON format: ${value}`);
          }
        }
        return value;
      };

      // Helper function to parse tags - handles single string, comma-separated, or JSON array
      const parseTags = (value: any): string[] | undefined => {
        if (!value || value === '') {
          return undefined;
        }

        if (Array.isArray(value)) {
          return value;
        }

        if (typeof value === 'string') {
          // Try parsing as JSON array first
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return parsed;
            }
            // If parsed but not an array, wrap it
            return [String(parsed)];
          } catch (error) {
            // Not valid JSON, treat as comma-separated or single value
            if (value.includes(',')) {
              return value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);
            }
            // Single tag
            return [value.trim()];
          }
        }

        return [String(value)];
      };

      // Helper function to parse array fields (like eventSpeakers)
      const parseStringArray = (value: any): string[] | undefined => {
        if (!value || value === '') {
          return undefined;
        }

        if (Array.isArray(value)) {
          return value;
        }

        if (typeof value === 'string') {
          // Try parsing as JSON array first
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return parsed;
            }
            // If parsed but not an array, wrap it
            return [String(parsed)];
          } catch (error) {
            // Not valid JSON, treat as comma-separated or single value
            if (value.includes(',')) {
              return value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
            }
            // Single value
            return [value.trim()];
          }
        }

        return [String(value)];
      };

      // Parse JSON fields from multipart/form-data
      const activityData: CreateActivityDto = {
        ...body,
        tagNames: parseTags(body.tagNames) || parseTags(body.eventTags),
        eventSocialMedia: safeJsonParse(body.eventSocialMedia, undefined),
        eventSpeakers: parseStringArray(body.eventSpeakers),
      };

      return await this.activityService.createActivity(
        activityData,
        req.user.id,
        file, // Pass the optional file
      );
    } else {
      throw new UnauthorizedException();
    }
  }

  @Put('update/:id')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update event',
    description:
      'Updates an existing event (requires creator ownership or admin role)',
  })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiBody({ type: UpdateActivityDto })
  @ApiResponse({
    status: 200,
    description: 'Event successfully updated',
    type: Activity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - must be event creator or admin',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async updateActivityById(
    @Param('id') id: string,
    @Body() activity: UpdateActivityDto,
    @Req() req: any,
  ): Promise<Activity> {
    // return activity to retrieve createdByUserId property value
    const preOperationActivity = await this.activityService.getActivityById(id);
    // admin can make edits regardless
    if (req.user.role === Role.admin) {
      return await this.activityService.updateActivity(
        id,
        activity,
        req.user.id,
      );
    }
    // have to check if they are the creator and if they still have creator access
    if (
      preOperationActivity.createdByUserId === req.user.id &&
      req.user.role === Role.creator
    ) {
      return await this.activityService.updateActivity(
        id,
        activity,
        req.user.id,
      );
    } else {
      throw new UnauthorizedException();
    }
  }

  @Delete('remove/:id')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete event',
    description: 'Deletes an event (requires creator ownership or admin role)',
  })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Event successfully deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - must be event creator or admin',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async deleteActivityById(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<void> {
    const preOperationActivity = await this.activityService.getActivityById(id);
    if (req.user.role === Role.admin) {
      return this.activityService.deleteActivity(id, req.user.id);
    }
    if (
      preOperationActivity.createdByUserId === req.user.id &&
      req.user.role === Role.creator
    ) {
      return await this.activityService.deleteActivity(id, req.user.id);
    } else {
      throw new UnauthorizedException();
    }
  }

  @Put('archive/:id')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Archive event',
    description: 'Archives an event (requires creator ownership or admin role)',
  })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Event successfully archived',
    type: Activity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - must be event creator or admin',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async archiveActivityById(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Activity> {
    const preOperationActivity: Activity =
      await this.activityService.getActivityById(id);
    if (req.user.role === Role.admin) {
      return this.activityService.archiveActivity(id);
    }
    if (
      preOperationActivity.createdByUserId === req.user.id &&
      req.user.role === Role.creator
    ) {
      return await this.activityService.archiveActivity(id);
    } else {
      throw new UnauthorizedException();
    }
  }

  @Put('unarchive/:id')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Unarchive event',
    description:
      'Unarchives an event (requires creator ownership or admin role)',
  })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Event successfully unarchived',
    type: Activity,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - must be event creator or admin',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async unarchiveActivityById(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Activity> {
    const preOperationActivity: Activity =
      await this.activityService.getActivityById(id);
    if (req.user.role === Role.admin) {
      return this.activityService.unarchiveActivity(id);
    }
    if (
      preOperationActivity.createdByUserId === req.user.id &&
      req.user.role === Role.creator
    ) {
      return await this.activityService.unarchiveActivity(id);
    } else {
      throw new UnauthorizedException();
    }
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search events',
    description: 'Search events by keyword with optional filters',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search term (searches title, description, location, host)',
    example: 'workshop',
  })
  @ApiQuery({
    name: 'isArchived',
    required: false,
    description: 'Search in archived events',
    example: 'false',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location',
    example: 'Seattle',
  })
  @ApiQuery({
    name: 'host',
    required: false,
    description: 'Filter by host',
    example: 'NSC',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter events starting from this date (ISO 8601)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter events ending before this date (ISO 8601)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching events',
    type: [Activity],
  })
  async searchActivities(
    @Query('q') searchTerm: string,
    @Query('isArchived') isArchived?: string,
    @Query('location') location?: string,
    @Query('host') host?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<Activity[]> {
    return this.activityService.searchActivities(searchTerm, {
      isArchived: isArchived === 'true',
      location,
      host,
      startDate,
      endDate,
    });
  }

  @Put(':id/cover-image')
  @UseGuards(AuthGuard())
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('coverImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload event cover image',
    description:
      'Uploads or updates the cover image for an event (requires creator ownership or admin role)',
  })
  @ApiParam({ name: 'id', description: 'Event ID (UUID)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        coverImage: {
          type: 'string',
          format: 'binary',
          description: 'Cover image file',
        },
      },
      required: ['coverImage'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cover image successfully uploaded',
    type: Activity,
  })
  @ApiResponse({ status: 400, description: 'No file uploaded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - must be event creator or admin',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async uploadCoverImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<Activity> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Check if user has permission to update this event
    const activity = await this.activityService.getActivityById(id);

    // Admin can upload cover image for any event
    if (req.user.role === Role.admin) {
      return await this.activityService.updateCoverImage(id, file, req.user.id);
    }

    // Creator can only upload cover image for their own events
    if (
      activity.createdByUserId === req.user.id &&
      req.user.role === Role.creator
    ) {
      return await this.activityService.updateCoverImage(id, file, req.user.id);
    } else {
      throw new UnauthorizedException(
        'You do not have permission to upload cover image for this event',
      );
    }
  }
}
