import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ActivityService } from './activity.service';
import { Activity } from '../../entities/activity.entity';
import { CreateActivityDto } from '../../dto/create-activity.dto';
import { UpdateActivityDto } from '../../dto/update-activity.dto';
import { TagService } from '../../../tag/tag.service';
import { MediaService } from '../../../media/media.service';
import { Media, MediaType } from '../../../media/entities/media.entity';

describe('ActivityService', () => {
  let service: ActivityService;
  let activityRepository: jest.Mocked<Repository<Activity>>;
  let tagService: jest.Mocked<TagService>;
  let mediaService: jest.Mocked<MediaService>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Activity>>;
  let module: TestingModule;

  // Suppress console.error during tests for cleaner output
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  const mockActivity: Activity = {
    id: 'activity-123',
    createdByUserId: 'user-123',
    createdByUser: null,
    registrations: [],
    eventTitle: 'Test Event',
    eventDescription: 'Test Description',
    startDate: new Date('2024-12-31T10:00:00Z'),
    endDate: new Date('2024-12-31T12:00:00Z'),
    eventLocation: 'Test Location',
    coverPhotoId: null,
    coverPhoto: null,
    documentId: null,
    document: null,
    eventHost: 'Test Host',
    eventMeetingURL: 'https://meet.example.com',
    eventRegistration: '',
    eventCapacity: '100',
    tags: [],
    eventSchedule: '',
    eventSpeakers: ['Speaker 1'],
    eventPrerequisites: '',
    eventCancellationPolicy: '',
    eventContact: 'test@example.com',
    eventSocialMedia: {
      facebook: 'https://facebook.com/test',
      twitter: 'https://twitter.com/test',
      instagram: '',
      hashtag: '#test',
    },
    eventPrivacy: 'public',
    eventAccessibility: '',
    eventNote: '',
    isHidden: false,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createActivityDto: CreateActivityDto = {
    createdByUser: undefined,
    eventTitle: 'Test Event',
    eventDescription: 'Test Description',
    startDate: '2024-12-31T10:00:00Z',
    endDate: '2024-12-31T12:00:00Z',
    eventLocation: 'Test Location',
    eventHost: 'Test Host',
    eventMeetingURL: 'https://meet.example.com',
    eventRegistration: '',
    eventCapacity: '100',
    tagNames: ['tech', 'workshop'],
    eventSchedule: '',
    eventSpeakers: ['Speaker 1'],
    eventPrerequisites: '',
    eventCancellationPolicy: '',
    eventContact: 'test@example.com',
    eventSocialMedia: {
      facebook: 'https://facebook.com/test',
      twitter: 'https://twitter.com/test',
      instagram: '',
      hashtag: '#test',
    },
    eventPrivacy: 'public',
    eventAccessibility: '',
    eventNote: '',
    isHidden: false,
    isArchived: false,
  };

  beforeEach(async () => {
    // Create mock query builder
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockActivity]),
    } as any;

    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const mockTagService = {
      findOrCreate: jest.fn(),
      findOrCreateMany: jest.fn().mockResolvedValue([]),
    };

    const mockMediaService = {
      uploadFile: jest.fn(),
      replaceMedia: jest.fn(),
      delete: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: getRepositoryToken(Activity),
          useValue: mockRepository,
        },
        {
          provide: TagService,
          useValue: mockTagService,
        },
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    activityRepository = module.get(getRepositoryToken(Activity));
    tagService = module.get(TagService);
    mediaService = module.get(MediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (module) {
      await module.close();
    }
  });

  describe('createActivity', () => {
    it('should create an activity without cover image', async () => {
      activityRepository.create.mockReturnValue(mockActivity);
      activityRepository.save.mockResolvedValue(mockActivity);

      const result = await service.createActivity(
        createActivityDto,
        'user-123',
      );

      expect(result).toEqual(mockActivity);
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventTitle: 'Test Event',
          createdByUserId: 'user-123',
        }),
      );
      expect(activityRepository.save).toHaveBeenCalledWith(mockActivity);
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.create.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(
        service.createActivity(createActivityDto, 'user-123'),
      ).rejects.toThrow(
        new HttpException(
          'Error creating activity: Database error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });

    it('should convert ISO 8601 date strings to Date objects', async () => {
      activityRepository.create.mockReturnValue(mockActivity);
      activityRepository.save.mockResolvedValue(mockActivity);

      await service.createActivity(createActivityDto, 'user-123');

      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
    });

    it('should create activity with cover image file', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'coverImage',
        originalname: 'test-cover.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 2048,
        buffer: Buffer.from('test-image-data'),
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const mockMedia: Media = {
        id: 'media-123',
        filename: 'test-cover.jpg',
        originalName: 'test-cover.jpg',
        mimeType: 'image/jpeg',
        size: 2048,
        s3Key: 'cover-images/test-cover.jpg',
        s3Url: 'https://s3.amazonaws.com/bucket/cover-image.jpg',
        type: MediaType.IMAGE,
        uploadedByUserId: 'user-123',
        uploadedBy: null,
        createdAt: new Date(),
      };
      mediaService.uploadFile.mockResolvedValue(mockMedia);

      const activityWithImage = {
        ...mockActivity,
        coverPhotoId: mockMedia.id,
      };
      activityRepository.create.mockReturnValue(activityWithImage);
      activityRepository.save.mockResolvedValue(activityWithImage);

      const result = await service.createActivity(
        createActivityDto,
        'user-123',
        mockFile,
      );

      expect(mediaService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'user-123',
        MediaType.IMAGE,
        'cover-images',
        true, // Enable resize
      );
      expect(result.coverPhotoId).toBe(mockMedia.id);
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          coverPhotoId: mockMedia.id,
          createdByUserId: 'user-123',
        }),
      );
      expect(activityRepository.save).toHaveBeenCalledWith(activityWithImage);
    });

    it('should rethrow BadRequestException from Media service', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'coverImage',
        originalname: 'invalid.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from('test'),
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const badRequestError = new BadRequestException('Invalid file type');
      mediaService.uploadFile.mockRejectedValue(badRequestError);

      await expect(
        service.createActivity(createActivityDto, 'user-123', mockFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw HttpException when media upload fails with generic error', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'coverImage',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      mediaService.uploadFile.mockRejectedValue(
        new Error('Media service unavailable'),
      );

      await expect(
        service.createActivity(createActivityDto, 'user-123', mockFile),
      ).rejects.toThrow(
        new HttpException(
          'Error creating activity: Media service unavailable',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getAllActivities', () => {
    it('should return all activities with default params', async () => {
      const result = await service.getAllActivities();

      expect(result).toEqual([mockActivity]);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'activity."isHidden" = false',
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'activity."isArchived" = :isArchived',
        { isArchived: false },
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(12);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });

    it('should handle custom pagination params', async () => {
      await service.getAllActivities({
        page: '2',
        numberOfEventsToGet: '20',
      });

      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('should filter by archived status', async () => {
      await service.getAllActivities({ isArchived: 'true' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'activity."isArchived" = :isArchived',
        { isArchived: true },
      );
    });

    it('should filter by tags when provided as array', async () => {
      await service.getAllActivities({ tags: ['tech', 'workshop'] });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('activity.id IN'),
        expect.objectContaining({
          tagNames: ['tech', 'workshop'],
        }),
      );
    });

    it('should filter by tags when provided as comma-separated string', async () => {
      await service.getAllActivities({ tags: 'tech,workshop' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('activity.id IN'),
        expect.objectContaining({
          tagNames: expect.arrayContaining(['tech', 'workshop']),
        }),
      );
    });

    it('should handle empty tag string', async () => {
      await service.getAllActivities({ tags: '' });

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1); // Only isArchived filter
    });

    it('should throw HttpException on query builder error', async () => {
      queryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllActivities()).rejects.toThrow(
        new HttpException(
          'Error retrieving activities',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getActivityById', () => {
    it('should return activity when found', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);

      const result = await service.getActivityById('activity-123');

      expect(result).toEqual(mockActivity);
      expect(activityRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'activity-123' },
      });
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.getActivityById('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.getActivityById('activity-123')).rejects.toThrow(
        new HttpException(
          'Error retrieving activity',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getActivitiesByUserId', () => {
    it('should return activities for a specific user', async () => {
      activityRepository.find.mockResolvedValue([mockActivity]);

      const result = await service.getActivitiesByUserId('user-123');

      expect(result).toEqual([mockActivity]);
      expect(activityRepository.find).toHaveBeenCalledWith({
        where: {
          createdByUserId: 'user-123',
          isHidden: false,
          isArchived: false,
        },
        order: { startDate: 'ASC' },
      });
    });

    it('should throw HttpException on error', async () => {
      activityRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.getActivitiesByUserId('user-123')).rejects.toThrow(
        new HttpException(
          'Error retrieving user activities',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('updateActivity', () => {
    const updateDto: Partial<UpdateActivityDto> = {
      createdByUser: undefined,
      eventTitle: 'Updated Event',
      eventDescription: 'Updated Description',
    };

    it('should update activity successfully', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      const updatedActivity = {
        ...mockActivity,
        eventTitle: 'Updated Event',
        eventDescription: 'Updated Description',
      };
      activityRepository.save.mockResolvedValue(updatedActivity);

      const result = await service.updateActivity(
        'activity-123',
        updateDto as UpdateActivityDto,
        'user-123',
      );

      expect(result).toEqual(updatedActivity);
      expect(activityRepository.save).toHaveBeenCalled();
    });

    it('should convert date strings to Date objects when provided', async () => {
      const updateWithDates: Partial<UpdateActivityDto> = {
        createdByUser: undefined,
        startDate: '2025-01-01T10:00:00Z',
        endDate: '2025-01-01T12:00:00Z',
      };
      activityRepository.findOne.mockResolvedValue(mockActivity);
      activityRepository.save.mockResolvedValue(mockActivity);

      await service.updateActivity(
        'activity-123',
        updateWithDates as UpdateActivityDto,
        'user-123',
      );

      const savedActivity = activityRepository.save.mock.calls[0][0];
      expect(savedActivity.startDate).toBeInstanceOf(Date);
      expect(savedActivity.endDate).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException when user does not own activity', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);

      await expect(
        service.updateActivity(
          'activity-123',
          updateDto as UpdateActivityDto,
          'other-user',
        ),
      ).rejects.toThrow(
        new BadRequestException('You can only update your own activities'),
      );
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateActivity(
          'invalid-id',
          updateDto as UpdateActivityDto,
          'user-123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      activityRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.updateActivity(
          'activity-123',
          updateDto as UpdateActivityDto,
          'user-123',
        ),
      ).rejects.toThrow(
        new HttpException(
          'Error updating activity',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('deleteActivity', () => {
    it('should delete activity successfully', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      activityRepository.remove.mockResolvedValue(mockActivity);

      await service.deleteActivity('activity-123', 'user-123');

      expect(activityRepository.remove).toHaveBeenCalledWith(mockActivity);
    });

    it('should throw BadRequestException when user does not own activity', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);

      await expect(
        service.deleteActivity('activity-123', 'other-user'),
      ).rejects.toThrow(
        new BadRequestException('You can only delete your own activities'),
      );
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteActivity('invalid-id', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      activityRepository.remove.mockRejectedValue(new Error('Database error'));

      await expect(
        service.deleteActivity('activity-123', 'user-123'),
      ).rejects.toThrow(
        new HttpException(
          'Error deleting activity',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('hideActivity', () => {
    it('should hide activity successfully', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      const hiddenActivity = { ...mockActivity, isHidden: true };
      activityRepository.save.mockResolvedValue(hiddenActivity);

      const result = await service.hideActivity('activity-123', 'user-123');

      expect(result.isHidden).toBe(true);
      expect(activityRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user does not own activity', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);

      await expect(
        service.hideActivity('activity-123', 'other-user'),
      ).rejects.toThrow(
        new BadRequestException('You can only hide your own activities'),
      );
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(
        service.hideActivity('invalid-id', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      activityRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.hideActivity('activity-123', 'user-123'),
      ).rejects.toThrow(
        new HttpException(
          'Error hiding activity',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('archiveActivity', () => {
    it('should archive activity successfully', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      const archivedActivity = { ...mockActivity, isArchived: true };
      activityRepository.save.mockResolvedValue(archivedActivity);

      const result = await service.archiveActivity('activity-123');

      expect(result.isArchived).toBe(true);
      expect(activityRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.archiveActivity('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      activityRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.archiveActivity('activity-123')).rejects.toThrow(
        new HttpException(
          'Error archiving activity',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('unarchiveActivity', () => {
    it('should unarchive activity successfully', async () => {
      const archivedActivity = { ...mockActivity, isArchived: true };
      activityRepository.findOne.mockResolvedValue(archivedActivity);
      const unarchivedActivity = { ...archivedActivity, isArchived: false };
      activityRepository.save.mockResolvedValue(unarchivedActivity);

      const result = await service.unarchiveActivity('activity-123');

      expect(result.isArchived).toBe(false);
      expect(activityRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.unarchiveActivity('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      activityRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.unarchiveActivity('activity-123')).rejects.toThrow(
        new HttpException(
          'Error unarchiving activity',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  // NOTE: addAttendee and removeAttendee tests removed
  // Attendee management is now handled via EventRegistrationService

  describe('searchActivities', () => {
    beforeEach(() => {
      // Reset queryBuilder mocks before each test
      queryBuilder.where.mockReturnThis();
      queryBuilder.andWhere.mockReturnThis();
      queryBuilder.orderBy.mockReturnThis();
      queryBuilder.getMany.mockResolvedValue([mockActivity]);
    });

    it('should return activities matching search term', async () => {
      const result = await service.searchActivities('test');

      expect(result).toEqual([mockActivity]);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'activity.isHidden = :isHidden',
        { isHidden: false },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'activity.isArchived = :isArchived',
        { isArchived: false },
      );
    });

    it('should search in archived events when isArchived is true', async () => {
      const result = await service.searchActivities('test', {
        isArchived: true,
      });

      expect(result).toEqual([mockActivity]);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'activity.isArchived = :isArchived',
        { isArchived: true },
      );
    });

    it('should filter by location when provided', async () => {
      await service.searchActivities('test', { location: 'Seattle' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'activity.eventLocation ILIKE :location',
        { location: '%Seattle%' },
      );
    });

    it('should filter by host when provided', async () => {
      await service.searchActivities('test', { host: 'NSC' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'activity.eventHost ILIKE :host',
        { host: '%NSC%' },
      );
    });

    it('should filter by date range when provided', async () => {
      await service.searchActivities('test', {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'activity.startDate >= :startDate',
        { startDate: new Date('2024-01-01') },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'activity.endDate <= :endDate',
        { endDate: new Date('2024-12-31') },
      );
    });

    it('should handle empty search term', async () => {
      await service.searchActivities('');

      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('ILIKE :searchTerm'),
        expect.anything(),
      );
    });

    it('should combine multiple filters', async () => {
      await service.searchActivities('workshop', {
        isArchived: true,
        location: 'Seattle',
        host: 'NSC',
        startDate: '2024-01-01',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'activity.isArchived = :isArchived',
        { isArchived: true },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'activity.eventLocation ILIKE :location',
        { location: '%Seattle%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'activity.eventHost ILIKE :host',
        { host: '%NSC%' },
      );
    });

    it('should throw HttpException on error', async () => {
      queryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.searchActivities('test')).rejects.toThrow(
        new HttpException(
          'Error searching activities',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('getArchivedActivities', () => {
    it('should return archived activities', async () => {
      const archivedActivity = { ...mockActivity, isArchived: true };
      activityRepository.find.mockResolvedValue([archivedActivity]);

      const result = await service.getArchivedActivities();

      expect(result).toEqual([archivedActivity]);
      expect(activityRepository.find).toHaveBeenCalledWith({
        where: { isArchived: true },
        order: { startDate: 'DESC' },
      });
    });

    it('should throw HttpException on error', async () => {
      activityRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.getArchivedActivities()).rejects.toThrow(
        new HttpException(
          'Error retrieving archived activities',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('updateCoverImage', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'coverImage',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('test'),
      stream: null,
      destination: '',
      filename: '',
      path: '',
    };

    it('should update cover image successfully', async () => {
      const mockMedia: Media = {
        id: 'media-456',
        filename: 'new-image.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        s3Key: 'cover-images/new-image.jpg',
        s3Url: 'https://s3.amazonaws.com/bucket/new-image.jpg',
        type: MediaType.IMAGE,
        uploadedByUserId: 'user-123',
        uploadedBy: null,
        createdAt: new Date(),
      };
      activityRepository.findOne.mockResolvedValue(mockActivity);
      mediaService.replaceMedia.mockResolvedValue(mockMedia);
      const updatedActivity = {
        ...mockActivity,
        coverPhotoId: mockMedia.id,
      };
      activityRepository.save.mockResolvedValue(updatedActivity);

      const result = await service.updateCoverImage(
        'activity-123',
        mockFile,
        'user-123',
      );

      expect(result.coverPhotoId).toBe(mockMedia.id);
      expect(mediaService.replaceMedia).toHaveBeenCalledWith(
        null, // old media ID (mockActivity has no existing cover photo)
        mockFile,
        'user-123',
        MediaType.IMAGE,
        'cover-images',
        true, // Enable resize
      );
      expect(activityRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateCoverImage('invalid-id', mockFile, 'user-123'),
      ).rejects.toThrow(
        new NotFoundException('Activity with ID invalid-id not found'),
      );
    });

    it('should throw BadRequestException when media upload fails', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      const badRequestError = new BadRequestException('Invalid file type');
      mediaService.replaceMedia.mockRejectedValue(badRequestError);

      await expect(
        service.updateCoverImage('activity-123', mockFile, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw HttpException for generic errors', async () => {
      const mockMedia: Media = {
        id: 'media-456',
        filename: 'new-image.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        s3Key: 'cover-images/new-image.jpg',
        s3Url: 'https://example.com/image.jpg',
        type: MediaType.IMAGE,
        uploadedByUserId: 'user-123',
        uploadedBy: null,
        createdAt: new Date(),
      };
      activityRepository.findOne.mockResolvedValue(mockActivity);
      mediaService.replaceMedia.mockResolvedValue(mockMedia);
      activityRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.updateCoverImage('activity-123', mockFile, 'user-123'),
      ).rejects.toThrow(
        new HttpException(
          'Error updating cover image',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });

  describe('updateTags', () => {
    it('should update activity tags successfully', async () => {
      const mockTags = [
        {
          id: 'tag-1',
          name: 'tech',
          slug: 'tech',
          activities: [],
          createdAt: new Date(),
        },
        {
          id: 'tag-2',
          name: 'workshop',
          slug: 'workshop',
          activities: [],
          createdAt: new Date(),
        },
      ];
      activityRepository.findOne.mockResolvedValue({
        ...mockActivity,
        tags: [],
      });
      tagService.findOrCreateMany.mockResolvedValue(mockTags);
      const updatedActivity = { ...mockActivity, tags: mockTags };
      activityRepository.save.mockResolvedValue(updatedActivity);

      const result = await service.updateTags('activity-123', [
        'tech',
        'workshop',
      ]);

      expect(result.tags).toEqual(mockTags);
      expect(tagService.findOrCreateMany).toHaveBeenCalledWith([
        'tech',
        'workshop',
      ]);
      expect(activityRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.updateTags('invalid-id', ['tech'])).rejects.toThrow(
        new NotFoundException('Activity with ID invalid-id not found'),
      );
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockResolvedValue({
        ...mockActivity,
        tags: [],
      });
      tagService.findOrCreateMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.updateTags('activity-123', ['tech']),
      ).rejects.toThrow(
        new HttpException(
          'Error updating activity tags',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
