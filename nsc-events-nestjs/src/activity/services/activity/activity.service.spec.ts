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
import { Activity, Attendee } from '../../entities/activity.entity';
import { CreateActivityDto } from '../../dto/create-activity.dto';
import { UpdateActivityDto } from '../../dto/update-activity.dto';
import { S3Service } from './s3.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let activityRepository: jest.Mocked<Repository<Activity>>;
  let s3Service: jest.Mocked<S3Service>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Activity>>;
  let module: TestingModule;

  // Suppress console.error during tests for cleaner output
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  const mockActivity: Activity = {
    id: 'activity-123',
    createdByUserId: 'user-123',
    eventTitle: 'Test Event',
    eventDescription: 'Test Description',
    startDate: new Date('2024-12-31T10:00:00Z'),
    endDate: new Date('2024-12-31T12:00:00Z'),
    eventLocation: 'Test Location',
    eventCoverPhoto: 'https://example.com/image.jpg',
    eventDocument: '',
    eventHost: 'Test Host',
    eventMeetingURL: 'https://meet.example.com',
    eventRegistration: '',
    eventCapacity: '100',
    eventTags: ['tech', 'workshop'],
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
    attendanceCount: 0,
    attendees: [],
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
    eventCoverPhoto: '',
    eventDocument: '',
    eventHost: 'Test Host',
    eventMeetingURL: 'https://meet.example.com',
    eventRegistration: '',
    eventCapacity: '100',
    eventTags: ['tech', 'workshop'],
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

    const mockS3Service = {
      uploadFile: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: getRepositoryToken(Activity),
          useValue: mockRepository,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    activityRepository = module.get(getRepositoryToken(Activity));
    s3Service = module.get(S3Service);
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

      const result = await service.createActivity(createActivityDto, 'user-123');

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
        new HttpException('Error creating activity: Database error', HttpStatus.INTERNAL_SERVER_ERROR),
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

      const uploadedImageUrl = 'https://s3.amazonaws.com/bucket/cover-image.jpg';
      s3Service.uploadFile.mockResolvedValue(uploadedImageUrl);

      const activityWithImage = {
        ...mockActivity,
        eventCoverPhoto: uploadedImageUrl,
      };
      activityRepository.create.mockReturnValue(activityWithImage);
      activityRepository.save.mockResolvedValue(activityWithImage);

      const result = await service.createActivity(
        createActivityDto,
        'user-123',
        mockFile,
      );

      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'cover-images',
        true, // Enable resize
      );
      expect(result.eventCoverPhoto).toBe(uploadedImageUrl);
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventCoverPhoto: uploadedImageUrl,
          createdByUserId: 'user-123',
        }),
      );
      expect(activityRepository.save).toHaveBeenCalledWith(activityWithImage);
    });

    it('should rethrow BadRequestException from S3 service', async () => {
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
      s3Service.uploadFile.mockRejectedValue(badRequestError);

      await expect(
        service.createActivity(createActivityDto, 'user-123', mockFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw HttpException when S3 upload fails with generic error', async () => {
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

      s3Service.uploadFile.mockRejectedValue(new Error('S3 service unavailable'));

      await expect(
        service.createActivity(createActivityDto, 'user-123', mockFile),
      ).rejects.toThrow(
        new HttpException('Error creating activity: S3 service unavailable', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('getAllActivities', () => {
    it('should return all activities with default params', async () => {
      const result = await service.getAllActivities();

      expect(result).toEqual([mockActivity]);
      expect(queryBuilder.where).toHaveBeenCalledWith('activity."isHidden" = false');
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
        expect.stringContaining('activity."eventTags" ~*'),
        expect.objectContaining({
          tag0: expect.stringContaining('tech'),
          tag1: expect.stringContaining('workshop'),
        }),
      );
    });

    it('should filter by tags when provided as comma-separated string', async () => {
      await service.getAllActivities({ tags: 'tech,workshop' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('activity."eventTags" ~*'),
        expect.any(Object),
      );
    });

    it('should handle empty tag string', async () => {
      await service.getAllActivities({ tags: '' });

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1); // Only isArchived filter
    });

    it('should throw HttpException on query builder error', async () => {
      queryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllActivities()).rejects.toThrow(
        new HttpException('Error retrieving activities', HttpStatus.INTERNAL_SERVER_ERROR),
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

      await expect(service.getActivityById('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.getActivityById('activity-123')).rejects.toThrow(
        new HttpException('Error retrieving activity', HttpStatus.INTERNAL_SERVER_ERROR),
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
        new HttpException('Error retrieving user activities', HttpStatus.INTERNAL_SERVER_ERROR),
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
        service.updateActivity('activity-123', updateDto as UpdateActivityDto, 'other-user'),
      ).rejects.toThrow(new BadRequestException('You can only update your own activities'));
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateActivity('invalid-id', updateDto as UpdateActivityDto, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      activityRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.updateActivity('activity-123', updateDto as UpdateActivityDto, 'user-123'),
      ).rejects.toThrow(new HttpException('Error updating activity', HttpStatus.INTERNAL_SERVER_ERROR));
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

      await expect(service.deleteActivity('activity-123', 'other-user')).rejects.toThrow(
        new BadRequestException('You can only delete your own activities'),
      );
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteActivity('invalid-id', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      activityRepository.remove.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteActivity('activity-123', 'user-123')).rejects.toThrow(
        new HttpException('Error deleting activity', HttpStatus.INTERNAL_SERVER_ERROR),
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

      await expect(service.hideActivity('activity-123', 'other-user')).rejects.toThrow(
        new BadRequestException('You can only hide your own activities'),
      );
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.hideActivity('invalid-id', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      activityRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.hideActivity('activity-123', 'user-123')).rejects.toThrow(
        new HttpException('Error hiding activity', HttpStatus.INTERNAL_SERVER_ERROR),
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

      await expect(service.archiveActivity('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      activityRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.archiveActivity('activity-123')).rejects.toThrow(
        new HttpException('Error archiving activity', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('addAttendee', () => {
    const attendee: Attendee = {
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should add attendee when attendees array is empty', async () => {
      const activityWithoutAttendees = { ...mockActivity, attendees: null };
      activityRepository.findOne.mockResolvedValue(activityWithoutAttendees);
      const updatedActivity = {
        ...activityWithoutAttendees,
        attendees: [attendee],
        attendanceCount: 1,
      };
      activityRepository.save.mockResolvedValue(updatedActivity);

      const result = await service.addAttendee('activity-123', attendee);

      expect(result.attendees).toContain(attendee);
      expect(result.attendanceCount).toBe(1);
    });

    it('should add attendee when attendees array already exists', async () => {
      const existingAttendee: Attendee = {
        firstName: 'Jane',
        lastName: 'Smith',
      };
      const activityWithAttendees = {
        ...mockActivity,
        attendees: [existingAttendee],
        attendanceCount: 1,
      };
      activityRepository.findOne.mockResolvedValue(activityWithAttendees);
      const updatedActivity = {
        ...activityWithAttendees,
        attendees: [existingAttendee, attendee],
        attendanceCount: 2,
      };
      activityRepository.save.mockResolvedValue(updatedActivity);

      const result = await service.addAttendee('activity-123', attendee);

      expect(result.attendees).toHaveLength(2);
      expect(result.attendanceCount).toBe(2);
    });

    it('should throw BadRequestException when attendee already registered', async () => {
      const activityWithAttendee = {
        ...mockActivity,
        attendees: [attendee],
      };
      activityRepository.findOne.mockResolvedValue(activityWithAttendee);

      await expect(service.addAttendee('activity-123', attendee)).rejects.toThrow(
        new BadRequestException('Attendee already registered'),
      );
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.addAttendee('invalid-id', attendee)).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      activityRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.addAttendee('activity-123', attendee)).rejects.toThrow(
        new HttpException('Error adding attendee', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('removeAttendee', () => {
    const attendees: Attendee[] = [
      { firstName: 'John', lastName: 'Doe' },
      { firstName: 'Jane', lastName: 'Smith' },
    ];

    it('should remove attendee successfully', async () => {
      const activityWithAttendees = {
        ...mockActivity,
        attendees: [...attendees],
        attendanceCount: 2,
      };
      activityRepository.findOne.mockResolvedValue(activityWithAttendees);
      const updatedActivity = {
        ...activityWithAttendees,
        attendees: [attendees[1]],
        attendanceCount: 1,
      };
      activityRepository.save.mockResolvedValue(updatedActivity);

      const result = await service.removeAttendee('activity-123', 0);

      expect(result.attendees).toHaveLength(1);
      expect(result.attendanceCount).toBe(1);
    });

    it('should throw BadRequestException when attendees array is null', async () => {
      const activityWithoutAttendees = { ...mockActivity, attendees: null };
      activityRepository.findOne.mockResolvedValue(activityWithoutAttendees);

      await expect(service.removeAttendee('activity-123', 0)).rejects.toThrow(
        new BadRequestException('Attendee not found'),
      );
    });

    it('should throw BadRequestException when index is out of bounds', async () => {
      const activityWithAttendees = { ...mockActivity, attendees };
      activityRepository.findOne.mockResolvedValue(activityWithAttendees);

      await expect(service.removeAttendee('activity-123', 5)).rejects.toThrow(
        new BadRequestException('Attendee not found'),
      );
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.removeAttendee('invalid-id', 0)).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException for generic errors', async () => {
      const activityWithAttendees = { ...mockActivity, attendees };
      activityRepository.findOne.mockResolvedValue(activityWithAttendees);
      activityRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.removeAttendee('activity-123', 0)).rejects.toThrow(
        new HttpException('Error removing attendee', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('searchActivities', () => {
    it('should return activities matching search term', async () => {
      const result = await service.searchActivities('test');

      expect(result).toEqual([mockActivity]);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'activity.isHidden = :isHidden AND activity.isArchived = :isArchived',
        { isHidden: false, isArchived: false },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(activity.eventTitle ILIKE :searchTerm OR activity.eventDescription ILIKE :searchTerm OR activity.eventLocation ILIKE :searchTerm)',
        { searchTerm: '%test%' },
      );
    });

    it('should throw HttpException on error', async () => {
      queryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.searchActivities('test')).rejects.toThrow(
        new HttpException('Error searching activities', HttpStatus.INTERNAL_SERVER_ERROR),
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
        new HttpException('Error retrieving archived activities', HttpStatus.INTERNAL_SERVER_ERROR),
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
      const uploadedImageUrl = 'https://s3.amazonaws.com/bucket/new-image.jpg';
      activityRepository.findOne.mockResolvedValue(mockActivity);
      s3Service.uploadFile.mockResolvedValue(uploadedImageUrl);
      const updatedActivity = {
        ...mockActivity,
        eventCoverPhoto: uploadedImageUrl,
      };
      activityRepository.save.mockResolvedValue(updatedActivity);

      const result = await service.updateCoverImage('activity-123', mockFile);

      expect(result.eventCoverPhoto).toBe(uploadedImageUrl);
      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        mockFile,
        'cover-images',
        true, // Enable resize
      );
      expect(activityRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when activity not found', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.updateCoverImage('invalid-id', mockFile)).rejects.toThrow(
        new NotFoundException('Activity with ID invalid-id not found'),
      );
    });

    it('should throw BadRequestException when S3 upload fails', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      const badRequestError = new BadRequestException('Invalid file type');
      s3Service.uploadFile.mockRejectedValue(badRequestError);

      await expect(service.updateCoverImage('activity-123', mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw HttpException for generic errors', async () => {
      activityRepository.findOne.mockResolvedValue(mockActivity);
      s3Service.uploadFile.mockResolvedValue('https://example.com/image.jpg');
      activityRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.updateCoverImage('activity-123', mockFile)).rejects.toThrow(
        new HttpException('Error updating cover image', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('escapeRegex (private method - tested through getAllActivities)', () => {
    it('should escape special regex characters in tags', async () => {
      // Test with tags that contain special regex characters
      await service.getAllActivities({ tags: ['test.*', 'data+', 'regex?'] });

      // Verify that the regex was called with escaped characters
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tag0: expect.stringContaining('test\\.\\*'),
          tag1: expect.stringContaining('data\\+'),
          tag2: expect.stringContaining('regex\\?'),
        }),
      );
    });
  });
});
