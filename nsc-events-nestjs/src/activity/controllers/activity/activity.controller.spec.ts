import { Test, TestingModule } from '@nestjs/testing';
import { ActivityController } from './activity.controller';
import { ActivityService } from '../../../activity/services/activity/activity.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Activity, Attendee } from '../../entities/activity.entity';
import { CreateActivityDto } from '../../dto/create-activity.dto';
import { UpdateActivityDto } from '../../dto/update-activity.dto';
import { AttendEventDto } from '../../dto/attend-event.dto';
import { Role } from '../../../user/entities/user.entity';

describe('ActivityController', () => {
  let controller: ActivityController;
  let service: ActivityService;

  const mockActivity: Activity = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    createdByUserId: 'user-123',
    eventTitle: 'Test Event',
    eventDescription: 'Test Description',
    startDate: new Date('2025-12-01T10:00:00Z'),
    endDate: new Date('2025-12-01T12:00:00Z'),
    eventLocation: 'Test Location',
    eventCoverPhoto: 'https://example.com/photo.jpg',
    eventDocument: 'https://example.com/doc.pdf',
    eventHost: 'Test Host',
    eventMeetingURL: 'https://meet.example.com',
    eventRegistration: 'https://register.example.com',
    eventCapacity: '100',
    eventTags: ['club', 'study'],
    eventSchedule: '10:00 AM - 12:00 PM',
    eventSpeakers: ['Speaker 1', 'Speaker 2'],
    eventPrerequisites: 'None',
    eventCancellationPolicy: 'Refund available',
    eventContact: 'contact@example.com',
    eventSocialMedia: { twitter: '@example', facebook: 'example' },
    attendanceCount: 0,
    attendees: [],
    eventPrivacy: 'Public',
    eventAccessibility: 'Wheelchair accessible',
    eventNote: 'Test note',
    isHidden: false,
    isArchived: false,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockActivityService = {
    getAllActivities: jest.fn(),
    getActivityById: jest.fn(),
    getActivitiesByUserId: jest.fn(),
    addAttendee: jest.fn(),
    createActivity: jest.fn(),
    updateActivity: jest.fn(),
    deleteActivity: jest.fn(),
    archiveActivity: jest.fn(),
    updateCoverImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    controller = module.get<ActivityController>(ActivityController);
    service = module.get<ActivityService>(ActivityService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllActivities', () => {
    it('should return an array of activities with default parameters', async () => {
      const expectedActivities = [mockActivity];
      mockActivityService.getAllActivities.mockResolvedValue(
        expectedActivities,
      );

      const result = await controller.getAllActivities();

      expect(result).toEqual(expectedActivities);
      expect(mockActivityService.getAllActivities).toHaveBeenCalledWith({
        page: '1',
        numberOfEventsToGet: '12',
        isArchived: 'false',
        tags: [],
      });
    });

    it('should return activities with custom page and take parameters', async () => {
      const expectedActivities = [mockActivity];
      mockActivityService.getAllActivities.mockResolvedValue(
        expectedActivities,
      );

      const result = await controller.getAllActivities('2', '20', 'false');

      expect(result).toEqual(expectedActivities);
      expect(mockActivityService.getAllActivities).toHaveBeenCalledWith({
        page: '2',
        numberOfEventsToGet: '20',
        isArchived: 'false',
        tags: [],
      });
    });

    it('should filter activities by single tag', async () => {
      const expectedActivities = [mockActivity];
      mockActivityService.getAllActivities.mockResolvedValue(
        expectedActivities,
      );

      const result = await controller.getAllActivities(
        '1',
        '12',
        'false',
        'club',
      );

      expect(result).toEqual(expectedActivities);
      expect(mockActivityService.getAllActivities).toHaveBeenCalledWith({
        page: '1',
        numberOfEventsToGet: '12',
        isArchived: 'false',
        tags: ['club'],
      });
    });

    it('should filter activities by multiple tags', async () => {
      const expectedActivities = [mockActivity];
      mockActivityService.getAllActivities.mockResolvedValue(
        expectedActivities,
      );

      const result = await controller.getAllActivities(
        '1',
        '12',
        'false',
        'club,study,sports',
      );

      expect(result).toEqual(expectedActivities);
      expect(mockActivityService.getAllActivities).toHaveBeenCalledWith({
        page: '1',
        numberOfEventsToGet: '12',
        isArchived: 'false',
        tags: ['club', 'study', 'sports'],
      });
    });

    it('should handle tags with whitespace and normalize them', async () => {
      const expectedActivities = [mockActivity];
      mockActivityService.getAllActivities.mockResolvedValue(
        expectedActivities,
      );

      const result = await controller.getAllActivities(
        '1',
        '12',
        'false',
        ' CLUB , Study ,  SPORTS  ',
      );

      expect(result).toEqual(expectedActivities);
      expect(mockActivityService.getAllActivities).toHaveBeenCalledWith({
        page: '1',
        numberOfEventsToGet: '12',
        isArchived: 'false',
        tags: ['club', 'study', 'sports'],
      });
    });

    it('should handle empty tags parameter', async () => {
      const expectedActivities = [mockActivity];
      mockActivityService.getAllActivities.mockResolvedValue(
        expectedActivities,
      );

      const result = await controller.getAllActivities('1', '12', 'false', '');

      expect(result).toEqual(expectedActivities);
      expect(mockActivityService.getAllActivities).toHaveBeenCalledWith({
        page: '1',
        numberOfEventsToGet: '12',
        isArchived: 'false',
        tags: [],
      });
    });

    it('should retrieve archived activities when isArchived is true', async () => {
      const archivedActivity = { ...mockActivity, isArchived: true };
      mockActivityService.getAllActivities.mockResolvedValue([
        archivedActivity,
      ]);

      const result = await controller.getAllActivities('1', '12', 'true');

      expect(result).toEqual([archivedActivity]);
      expect(mockActivityService.getAllActivities).toHaveBeenCalledWith({
        page: '1',
        numberOfEventsToGet: '12',
        isArchived: 'true',
        tags: [],
      });
    });
  });

  describe('findActivityById', () => {
    it('should return a single activity by id', async () => {
      mockActivityService.getActivityById.mockResolvedValue(mockActivity);

      const result = await controller.findActivityById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockActivity);
      expect(mockActivityService.getActivityById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
      );
    });

    it('should pass through service errors', async () => {
      mockActivityService.getActivityById.mockRejectedValue(
        new Error('Activity not found'),
      );

      await expect(
        controller.findActivityById('non-existent-id'),
      ).rejects.toThrow('Activity not found');
    });
  });

  describe('getActivitiesByUserId', () => {
    it('should return all activities created by a specific user', async () => {
      const userActivities = [mockActivity, { ...mockActivity, id: 'activity-2' }];
      mockActivityService.getActivitiesByUserId.mockResolvedValue(
        userActivities,
      );

      const result = await controller.getActivitiesByUserId('user-123');

      expect(result).toEqual(userActivities);
      expect(mockActivityService.getActivitiesByUserId).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should return empty array if user has no activities', async () => {
      mockActivityService.getActivitiesByUserId.mockResolvedValue([]);

      const result = await controller.getActivitiesByUserId('user-456');

      expect(result).toEqual([]);
      expect(mockActivityService.getActivitiesByUserId).toHaveBeenCalledWith(
        'user-456',
      );
    });
  });

  describe('attendEvent', () => {
    it('should add attendee with first and last name to event', async () => {
      const attendEventDto: AttendEventDto = {
        attendee: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const updatedActivity = {
        ...mockActivity,
        attendees: [{ firstName: 'John', lastName: 'Doe' }],
        attendanceCount: 1,
      };

      mockActivityService.addAttendee.mockResolvedValue(updatedActivity);

      const mockRequest = {
        user: { id: 'user-123', role: Role.creator },
      };

      const result = await controller.attendEvent(
        'event-123',
        attendEventDto,
      );

      expect(result).toEqual(updatedActivity);
      expect(mockActivityService.addAttendee).toHaveBeenCalledWith(
        'event-123',
        { firstName: 'John', lastName: 'Doe' },
      );
    });

    it('should handle attendee with empty strings when attendee data is missing', async () => {
      const attendEventDto: AttendEventDto = {
        attendee: undefined,
      };

      const updatedActivity = {
        ...mockActivity,
        attendees: [{ firstName: '', lastName: '' }],
        attendanceCount: 1,
      };

      mockActivityService.addAttendee.mockResolvedValue(updatedActivity);

      const mockRequest = {
        user: { id: 'user-123', role: Role.creator },
      };

      const result = await controller.attendEvent(
        'event-123',
        attendEventDto,
      );

      expect(result).toEqual(updatedActivity);
      expect(mockActivityService.addAttendee).toHaveBeenCalledWith(
        'event-123',
        { firstName: '', lastName: '' },
      );
    });

    it('should handle partial attendee information', async () => {
      const attendEventDto: AttendEventDto = {
        attendee: {
          firstName: 'Jane',
        },
      };

      const updatedActivity = {
        ...mockActivity,
        attendees: [{ firstName: 'Jane', lastName: '' }],
        attendanceCount: 1,
      };

      mockActivityService.addAttendee.mockResolvedValue(updatedActivity);

      const mockRequest = {
        user: { id: 'user-123', role: Role.creator },
      };

      const result = await controller.attendEvent(
        'event-123',
        attendEventDto,
      );

      expect(result).toEqual(updatedActivity);
      expect(mockActivityService.addAttendee).toHaveBeenCalledWith(
        'event-123',
        { firstName: 'Jane', lastName: '' },
      );
    });
  });

  describe('addEvent', () => {
    const createActivityDto: CreateActivityDto = {
      createdByUser: undefined,
      eventTitle: 'New Event',
      eventDescription: 'Event Description',
      startDate: '2025-12-01T10:00:00Z',
      endDate: '2025-12-01T12:00:00Z',
      eventLocation: 'Test Location',
      eventCoverPhoto: 'https://example.com/photo.jpg',
      eventDocument: 'https://example.com/doc.pdf',
      eventHost: 'Test Host',
      eventMeetingURL: 'https://meet.example.com',
      eventRegistration: 'https://register.example.com',
      eventCapacity: '100',
      eventTags: ['club', 'study'],
      eventSchedule: '10:00 AM - 12:00 PM',
      eventSpeakers: ['Speaker 1'],
      eventPrerequisites: 'None',
      eventCancellationPolicy: 'Refund available',
      eventContact: 'contact@example.com',
      eventSocialMedia: { twitter: '@example' },
      eventPrivacy: 'Public',
      eventAccessibility: 'Wheelchair accessible',
      eventNote: 'Test note',
      isHidden: false,
      isArchived: false,
    };

    it('should create a new event when user is creator', async () => {
      const mockRequest = {
        user: { id: 'creator-123', role: Role.creator },
      };

      mockActivityService.createActivity.mockResolvedValue(mockActivity);

      const result = await controller.addEvent(createActivityDto, mockRequest);

      expect(result).toEqual(mockActivity);
      expect(mockActivityService.createActivity).toHaveBeenCalledWith(
        createActivityDto,
        'creator-123',
      );
    });

    it('should create a new event when user is admin', async () => {
      const mockRequest = {
        user: { id: 'admin-123', role: Role.admin },
      };

      mockActivityService.createActivity.mockResolvedValue(mockActivity);

      const result = await controller.addEvent(createActivityDto, mockRequest);

      expect(result).toEqual(mockActivity);
      expect(mockActivityService.createActivity).toHaveBeenCalledWith(
        createActivityDto,
        'admin-123',
      );
    });

    it('should throw UnauthorizedException when user is regular user', async () => {
      const mockRequest = {
        user: { id: 'user-123', role: Role.user },
      };

      await expect(
        controller.addEvent(createActivityDto, mockRequest),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockActivityService.createActivity).not.toHaveBeenCalled();
    });
  });

  describe('updateActivityById', () => {
    const updateActivityDto: UpdateActivityDto = {
      createdByUser: undefined,
      eventTitle: 'Updated Event',
      eventDescription: 'Updated Description',
      startDate: '2025-12-02T10:00:00Z',
      endDate: '2025-12-02T12:00:00Z',
      eventLocation: 'Updated Location',
      eventCoverPhoto: 'https://example.com/new-photo.jpg',
      eventDocument: 'https://example.com/new-doc.pdf',
      eventHost: 'Updated Host',
      eventMeetingURL: 'https://meet.example.com/new',
      eventRegistration: 'https://register.example.com/new',
      eventCapacity: '150',
      eventTags: ['workshop', 'tech'],
      eventSchedule: '2:00 PM - 4:00 PM',
      eventSpeakers: ['New Speaker'],
      eventPrerequisites: 'Basic knowledge',
      eventCancellationPolicy: 'No refund',
      eventContact: 'newcontact@example.com',
      eventSocialMedia: { instagram: '@newexample' },
      eventPrivacy: 'Private',
      eventAccessibility: 'All accessible',
      eventNote: 'Updated note',
      isHidden: false,
      isArchived: false,
    };

    it('should update activity when user is admin', async () => {
      const mockRequest = {
        user: { id: 'admin-123', role: Role.admin },
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);
      mockActivityService.updateActivity.mockResolvedValue({
        ...mockActivity,
        ...updateActivityDto,
      });

      const result = await controller.updateActivityById(
        'activity-123',
        updateActivityDto,
        mockRequest,
      );

      expect(result).toBeDefined();
      expect(mockActivityService.getActivityById).toHaveBeenCalledWith(
        'activity-123',
      );
      expect(mockActivityService.updateActivity).toHaveBeenCalledWith(
        'activity-123',
        updateActivityDto,
        'admin-123',
      );
    });

    it('should update activity when user is creator and owns the activity', async () => {
      const mockRequest = {
        user: { id: 'user-123', role: Role.creator },
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);
      mockActivityService.updateActivity.mockResolvedValue({
        ...mockActivity,
        ...updateActivityDto,
      });

      const result = await controller.updateActivityById(
        'activity-123',
        updateActivityDto,
        mockRequest,
      );

      expect(result).toBeDefined();
      expect(mockActivityService.getActivityById).toHaveBeenCalledWith(
        'activity-123',
      );
      expect(mockActivityService.updateActivity).toHaveBeenCalledWith(
        'activity-123',
        updateActivityDto,
        'user-123',
      );
    });

    it('should throw UnauthorizedException when creator does not own the activity', async () => {
      const mockRequest = {
        user: { id: 'different-user', role: Role.creator },
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);

      await expect(
        controller.updateActivityById(
          'activity-123',
          updateActivityDto,
          mockRequest,
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockActivityService.updateActivity).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is regular user', async () => {
      const mockRequest = {
        user: { id: 'user-123', role: Role.user },
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);

      await expect(
        controller.updateActivityById(
          'activity-123',
          updateActivityDto,
          mockRequest,
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockActivityService.updateActivity).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when creator role but not owner', async () => {
      const mockRequest = {
        user: { id: 'other-creator', role: Role.creator },
      };

      const activityOwnedByDifferentUser = {
        ...mockActivity,
        createdByUserId: 'user-123',
      };

      mockActivityService.getActivityById.mockResolvedValue(
        activityOwnedByDifferentUser,
      );

      await expect(
        controller.updateActivityById(
          'activity-123',
          updateActivityDto,
          mockRequest,
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockActivityService.updateActivity).not.toHaveBeenCalled();
    });
  });

  describe('deleteActivityById', () => {
    it('should delete activity when user is admin', async () => {
      const mockRequest = {
        user: { id: 'admin-123', role: Role.admin },
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);
      mockActivityService.deleteActivity.mockResolvedValue(undefined);

      await controller.deleteActivityById('activity-123', mockRequest);

      expect(mockActivityService.getActivityById).toHaveBeenCalledWith(
        'activity-123',
      );
      expect(mockActivityService.deleteActivity).toHaveBeenCalledWith(
        'activity-123',
        'admin-123',
      );
    });

    it('should delete activity when user is creator and owns the activity', async () => {
      const mockRequest = {
        user: { id: 'user-123', role: Role.creator },
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);
      mockActivityService.deleteActivity.mockResolvedValue(undefined);

      await controller.deleteActivityById('activity-123', mockRequest);

      expect(mockActivityService.getActivityById).toHaveBeenCalledWith(
        'activity-123',
      );
      expect(mockActivityService.deleteActivity).toHaveBeenCalledWith(
        'activity-123',
        'user-123',
      );
    });

    it('should throw UnauthorizedException when creator does not own the activity', async () => {
      const mockRequest = {
        user: { id: 'different-user', role: Role.creator },
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);

      await expect(
        controller.deleteActivityById('activity-123', mockRequest),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockActivityService.deleteActivity).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is regular user', async () => {
      const mockRequest = {
        user: { id: 'user-123', role: Role.user },
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);

      await expect(
        controller.deleteActivityById('activity-123', mockRequest),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockActivityService.deleteActivity).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when creator role but not owner', async () => {
      const mockRequest = {
        user: { id: 'other-creator', role: Role.creator },
      };

      const activityOwnedByDifferentUser = {
        ...mockActivity,
        createdByUserId: 'user-123',
      };

      mockActivityService.getActivityById.mockResolvedValue(
        activityOwnedByDifferentUser,
      );

      await expect(
        controller.deleteActivityById('activity-123', mockRequest),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockActivityService.deleteActivity).not.toHaveBeenCalled();
    });
  });

  describe('archiveActivityById', () => {
    it('should archive activity when user is admin', async () => {
      const mockRequest = {
        user: { id: 'admin-123', role: Role.admin },
      };

      const archivedActivity = { ...mockActivity, isArchived: true };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);
      mockActivityService.archiveActivity.mockResolvedValue(archivedActivity);

      const result = await controller.archiveActivityById(
        'activity-123',
        mockRequest,
      );

      expect(result).toEqual(archivedActivity);
      expect(mockActivityService.getActivityById).toHaveBeenCalledWith(
        'activity-123',
      );
      expect(mockActivityService.archiveActivity).toHaveBeenCalledWith(
        'activity-123',
      );
    });

    it('should archive activity when user is creator and owns the activity', async () => {
      const mockRequest = {
        user: { id: 'user-123', role: Role.creator },
      };

      const archivedActivity = { ...mockActivity, isArchived: true };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);
      mockActivityService.archiveActivity.mockResolvedValue(archivedActivity);

      const result = await controller.archiveActivityById(
        'activity-123',
        mockRequest,
      );

      expect(result).toEqual(archivedActivity);
      expect(mockActivityService.getActivityById).toHaveBeenCalledWith(
        'activity-123',
      );
      expect(mockActivityService.archiveActivity).toHaveBeenCalledWith(
        'activity-123',
      );
    });

    it('should throw UnauthorizedException when creator does not own the activity', async () => {
      const mockRequest = {
        user: { id: 'different-user', role: Role.creator },
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);

      await expect(
        controller.archiveActivityById('activity-123', mockRequest),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockActivityService.archiveActivity).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is regular user', async () => {
      const mockRequest = {
        user: { id: 'user-123', role: Role.user },
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);

      await expect(
        controller.archiveActivityById('activity-123', mockRequest),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockActivityService.archiveActivity).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when creator role but not owner', async () => {
      const mockRequest = {
        user: { id: 'other-creator', role: Role.creator },
      };

      const activityOwnedByDifferentUser = {
        ...mockActivity,
        createdByUserId: 'user-123',
      };

      mockActivityService.getActivityById.mockResolvedValue(
        activityOwnedByDifferentUser,
      );

      await expect(
        controller.archiveActivityById('activity-123', mockRequest),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockActivityService.archiveActivity).not.toHaveBeenCalled();
    });
  });

  describe('uploadCoverImage', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'coverImage',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('test'),
      destination: '',
      filename: 'test-image.jpg',
      path: '',
      stream: null,
    };

    it('should upload cover image when user is admin', async () => {
      const mockRequest = {
        user: { id: 'admin-123', role: Role.admin },
      };

      const updatedActivity = {
        ...mockActivity,
        eventCoverPhoto: 'https://s3.amazonaws.com/bucket/cover-images/test-image.jpg',
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);
      mockActivityService.updateCoverImage.mockResolvedValue(updatedActivity);

      const result = await controller.uploadCoverImage(
        'activity-123',
        mockFile,
        mockRequest,
      );

      expect(result).toEqual(updatedActivity);
      expect(mockActivityService.getActivityById).toHaveBeenCalledWith(
        'activity-123',
      );
      expect(mockActivityService.updateCoverImage).toHaveBeenCalledWith(
        'activity-123',
        mockFile,
      );
    });

    it('should upload cover image when user is creator and owns the activity', async () => {
      const mockRequest = {
        user: { id: 'user-123', role: Role.creator },
      };

      const updatedActivity = {
        ...mockActivity,
        eventCoverPhoto: 'https://s3.amazonaws.com/bucket/cover-images/test-image.jpg',
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);
      mockActivityService.updateCoverImage.mockResolvedValue(updatedActivity);

      const result = await controller.uploadCoverImage(
        'activity-123',
        mockFile,
        mockRequest,
      );

      expect(result).toEqual(updatedActivity);
      expect(mockActivityService.getActivityById).toHaveBeenCalledWith(
        'activity-123',
      );
      expect(mockActivityService.updateCoverImage).toHaveBeenCalledWith(
        'activity-123',
        mockFile,
      );
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      const mockRequest = {
        user: { id: 'admin-123', role: Role.admin },
      };

      await expect(
        controller.uploadCoverImage('activity-123', null, mockRequest),
      ).rejects.toThrow(BadRequestException);

      expect(mockActivityService.getActivityById).not.toHaveBeenCalled();
      expect(mockActivityService.updateCoverImage).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when creator does not own the activity', async () => {
      const mockRequest = {
        user: { id: 'different-user', role: Role.creator },
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);

      await expect(
        controller.uploadCoverImage('activity-123', mockFile, mockRequest),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockActivityService.updateCoverImage).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is regular user', async () => {
      const mockRequest = {
        user: { id: 'user-123', role: Role.user },
      };

      mockActivityService.getActivityById.mockResolvedValue(mockActivity);

      await expect(
        controller.uploadCoverImage('activity-123', mockFile, mockRequest),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockActivityService.updateCoverImage).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with specific message when creator does not own activity', async () => {
      const mockRequest = {
        user: { id: 'other-creator', role: Role.creator },
      };

      const activityOwnedByDifferentUser = {
        ...mockActivity,
        createdByUserId: 'user-123',
      };

      mockActivityService.getActivityById.mockResolvedValue(
        activityOwnedByDifferentUser,
      );

      await expect(
        controller.uploadCoverImage('activity-123', mockFile, mockRequest),
      ).rejects.toThrow(
        new UnauthorizedException(
          'You do not have permission to upload cover image for this event',
        ),
      );

      expect(mockActivityService.updateCoverImage).not.toHaveBeenCalled();
    });
  });
});