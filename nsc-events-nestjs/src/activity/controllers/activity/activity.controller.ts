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
import { Activity, Attendee } from '../../entities/activity.entity';
import { CreateActivityDto } from '../../dto/create-activity.dto';
import { UpdateActivityDto } from '../../dto/update-activity.dto';
import { Query as ExpressQuery } from 'express-serve-static-core';
import { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '../../../user/entities/user.entity';
import { AttendEventDto } from '../../dto/attend-event.dto';
@Controller('events')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}
  @Get('')
  async getAllActivities(@Query() query: ExpressQuery): Promise<Activity[]> {
    return await this.activityService.getAllActivities(query);
  }
  @Get('find/:id')
  async findActivityById(@Param('id') id: string): Promise<Activity> {
    return this.activityService.getActivityById(id);
  }
  // request all events created by a specific user
  @Get('user/:userId')
  async getActivitiesByUserId(
    @Param('userId') userId: string,
  ): Promise<Activity[]> {
    return this.activityService.getActivitiesByUserId(userId);
  }

  // NOTE: Event attendance is now handled by the EventRegistrationController
  // This endpoint is deprecated and should be removed in favor of /event-registration/attend
  @Post('attend/:id')
  @UseGuards(AuthGuard())
  async attendEvent(
    @Param('id') eventId: string,
    @Body() attendEventDto: AttendEventDto,
  ) {
    // Extract attendee information from DTO
    const attendee: Attendee = {
      firstName: attendEventDto.attendee?.firstName || '',
      lastName: attendEventDto.attendee?.lastName || '',
    };
    return await this.activityService.addAttendee(eventId, attendee);
  }

  @Post('new')
  @UseGuards(AuthGuard())
  async addEvent(
    @Body() activity: CreateActivityDto,
    @Req() req: any,
  ): Promise<Activity> {
    if (req.user.role != Role.user) {
      return await this.activityService.createActivity(activity, req.user.id);
    } else {
      throw new UnauthorizedException();
    }
  }

  @Put('update/:id')
  @UseGuards(AuthGuard())
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

  // TODO: File upload functionality (cover images, documents) can be implemented here
  // when needed for PostgreSQL version

  @Put(':id/cover-image')
  @UseGuards(AuthGuard())
  @UseInterceptors(FileInterceptor('coverImage'))
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
      return await this.activityService.updateCoverImage(id, file);
    }

    // Creator can only upload cover image for their own events
    if (
      activity.createdByUserId === req.user.id &&
      req.user.role === Role.creator
    ) {
      return await this.activityService.updateCoverImage(id, file);
    } else {
      throw new UnauthorizedException(
        'You do not have permission to upload cover image for this event',
      );
    }
  }
}
