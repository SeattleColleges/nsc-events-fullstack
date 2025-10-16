import { Test, TestingModule } from '@nestjs/testing';
import { EventRegistrationController } from './event-registration.controller';
import { EventRegistrationService } from '../services/event-registration.service';
import { ActivityService } from '../../activity/services/activity/activity.service';

const mockEventRegistrationService = {
  createEventRegistration: jest.fn(),
  getEventRegistrationsByActivityId: jest.fn(),
  getEventRegistrationsByUserId: jest.fn(),
  deleteEventRegistration: jest.fn(),
  markAttendance: jest.fn(),
  getAttendeesForActivity: jest.fn(),
  getRegistrationStats: jest.fn(),
};

const mockActivityService = {
  getActivityById: jest.fn(),
};

describe('EventRegistrationController', () => {
  let controller: EventRegistrationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventRegistrationController],
      providers: [
        {
          provide: EventRegistrationService,
          useValue: mockEventRegistrationService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    controller = module.get<EventRegistrationController>(
      EventRegistrationController,
    );
  });

  test('controller should be defined', () => {
    expect(controller).toBeDefined();
  });
});

// Test suite for registerForEvent method
describe('EventRegistrationController.registerForEvent', () => {
  let controller: EventRegistrationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventRegistrationController],
      providers: [
        {
          provide: EventRegistrationService,
          useValue: mockEventRegistrationService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    controller = module.get<EventRegistrationController>(
      EventRegistrationController,
    );
  });

  test('should register a user for an event', async () => {
    // Arrange
    const createDto = {
      activityId: 'activity-123',
      userId: 'user-456',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      college: 'Engineering',
      yearOfStudy: '2nd Year',
      isAttended: false,
    };

    const expectedResult = {
      id: '1',
      ...createDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockEventRegistrationService.createEventRegistration.mockResolvedValue(
      expectedResult,
    );

    // Act
    const result = await controller.registerForEvent(createDto);

    // Assert
    expect(
      mockEventRegistrationService.createEventRegistration,
    ).toHaveBeenCalledWith(createDto);
    expect(result).toBe(expectedResult);
  });
});

// Test suite for getRegistrationsForEvent method
describe('EventRegistrationController.getRegistrationsForEvent', () => {
  let controller: EventRegistrationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventRegistrationController],
      providers: [
        {
          provide: EventRegistrationService,
          useValue: mockEventRegistrationService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    controller = module.get<EventRegistrationController>(
      EventRegistrationController,
    );
  });

  test('should return all registrations for an event', async () => {
    // Arrange
    const activityId = 'activity-123';
    const expectedRegistrations = {
      count: 0,
      anonymousCount: 0,
      attendees: [],
      attendeeNames: [],
    };

    mockEventRegistrationService.getEventRegistrationsByActivityId.mockResolvedValue(
      [],
    );

    // Act
    const result = await controller.getRegistrationsForEvent(activityId);

    // Assert
    expect(
      mockEventRegistrationService.getEventRegistrationsByActivityId,
    ).toHaveBeenCalledWith(activityId);
    expect(result).toStrictEqual(expectedRegistrations);
  });
});

// Test suite for getEventsForUser method
describe('EventRegistrationController.getEventsForUser', () => {
  let controller: EventRegistrationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventRegistrationController],
      providers: [
        {
          provide: EventRegistrationService,
          useValue: mockEventRegistrationService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    controller = module.get<EventRegistrationController>(
      EventRegistrationController,
    );
  });

  test('should return all events a user is registered for', async () => {
    // Arrange
    const userId = 'user-456';
    const expectedRegistrations = [];

    mockEventRegistrationService.getEventRegistrationsByUserId.mockResolvedValue(
      expectedRegistrations,
    );

    // Act
    const result = await controller.getEventsForUser(userId);

    // Assert
    expect(
      mockEventRegistrationService.getEventRegistrationsByUserId,
    ).toHaveBeenCalledWith(userId);
    expect(result).toStrictEqual(expectedRegistrations);
  });
});

// Test suite for isUserRegistered method
describe('EventRegistrationController.isUserRegistered', () => {
  let controller: EventRegistrationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventRegistrationController],
      providers: [
        {
          provide: EventRegistrationService,
          useValue: mockEventRegistrationService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    controller = module.get<EventRegistrationController>(
      EventRegistrationController,
    );
  });

  test('should check if a user is registered for an event - user is registered', async () => {
    // Arrange
    const activityId = 'activity-123';
    const userId = 'user-456';
    const mockRegistrations = [
      { userId: 'user-456', activityId: 'activity-123' },
    ];

    mockEventRegistrationService.getEventRegistrationsByActivityId.mockResolvedValue(
      mockRegistrations,
    );

    // Act
    const result = await controller.isUserRegistered(activityId, userId);

    // Assert
    expect(
      mockEventRegistrationService.getEventRegistrationsByActivityId,
    ).toHaveBeenCalledWith(activityId);
    expect(result).toEqual({ isRegistered: true });
  });

  test('should check if a user is registered for an event - user is not registered', async () => {
    // Arrange
    const activityId = 'activity-123';
    const userId = 'user-456';
    const mockRegistrations = [
      { userId: 'different-user', activityId: 'activity-123' },
    ];

    mockEventRegistrationService.getEventRegistrationsByActivityId.mockResolvedValue(
      mockRegistrations,
    );

    // Act
    const result = await controller.isUserRegistered(activityId, userId);

    // Assert
    expect(
      mockEventRegistrationService.getEventRegistrationsByActivityId,
    ).toHaveBeenCalledWith(activityId);
    expect(result).toEqual({ isRegistered: false });
  });
});

// Test suite for unregisterFromEvent method
describe('EventRegistrationController.unregisterFromEvent', () => {
  let controller: EventRegistrationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventRegistrationController],
      providers: [
        {
          provide: EventRegistrationService,
          useValue: mockEventRegistrationService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    controller = module.get<EventRegistrationController>(
      EventRegistrationController,
    );
  });

  test('should unregister a user from an event', async () => {
    // Arrange
    const registrationId = '123';

    mockEventRegistrationService.deleteEventRegistration.mockResolvedValue(
      undefined,
    );

    // Act
    const result = await controller.unregisterFromEvent(registrationId);

    // Assert
    expect(
      mockEventRegistrationService.deleteEventRegistration,
    ).toHaveBeenCalledWith(registrationId);
    expect(result).toEqual({ message: 'Successfully unregistered from event' });
  });
});

// Test suite for markAttendance method
describe('EventRegistrationController.markAttendance', () => {
  let controller: EventRegistrationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventRegistrationController],
      providers: [
        {
          provide: EventRegistrationService,
          useValue: mockEventRegistrationService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    controller = module.get<EventRegistrationController>(
      EventRegistrationController,
    );
  });

  test('should mark attendance for a registration', async () => {
    // Arrange
    const registrationId = '123';
    const isAttended = true;
    const updatedRegistration = {
      id: registrationId,
      activityId: 'activity-123',
      userId: 'user-456',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      college: 'Engineering',
      yearOfStudy: '2nd Year',
      isAttended: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockEventRegistrationService.markAttendance.mockResolvedValue(
      updatedRegistration,
    );

    // Act
    const result = await controller.markAttendance(registrationId, {
      isAttended,
    });

    // Assert
    expect(mockEventRegistrationService.markAttendance).toHaveBeenCalledWith(
      registrationId,
      isAttended,
    );
    expect(result).toBe(updatedRegistration);
  });
});

// Test suite for getAttendeesForEvent method
describe('EventRegistrationController.getAttendeesForEvent', () => {
  let controller: EventRegistrationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventRegistrationController],
      providers: [
        {
          provide: EventRegistrationService,
          useValue: mockEventRegistrationService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    controller = module.get<EventRegistrationController>(
      EventRegistrationController,
    );
  });

  test('should get attendees for an event', async () => {
    // Arrange
    const activityId = 'activity-123';
    const expectedAttendees = [];

    mockEventRegistrationService.getAttendeesForActivity.mockResolvedValue(
      expectedAttendees,
    );

    // Act
    const result = await controller.getAttendeesForEvent(activityId);

    // Assert
    expect(
      mockEventRegistrationService.getAttendeesForActivity,
    ).toHaveBeenCalledWith(activityId);
    expect(result).toBe(expectedAttendees);
  });
});

// Test suite for getRegistrationStats method
describe('EventRegistrationController.getRegistrationStats', () => {
  let controller: EventRegistrationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventRegistrationController],
      providers: [
        {
          provide: EventRegistrationService,
          useValue: mockEventRegistrationService,
        },
        {
          provide: ActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    controller = module.get<EventRegistrationController>(
      EventRegistrationController,
    );
  });

  test('should get registration statistics for an event', async () => {
    // Arrange
    const activityId = 'activity-123';
    const expectedStats = {
      totalRegistrations: 10,
      totalAttendees: 8,
      attendanceRate: 80,
    };

    mockEventRegistrationService.getRegistrationStats.mockResolvedValue(
      expectedStats,
    );

    // Act
    const result = await controller.getRegistrationStats(activityId);

    // Assert
    expect(
      mockEventRegistrationService.getRegistrationStats,
    ).toHaveBeenCalledWith(activityId);
    expect(result).toBe(expectedStats);
  });
});
