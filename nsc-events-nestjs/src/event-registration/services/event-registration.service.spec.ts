import { Test, TestingModule } from '@nestjs/testing';
import { EventRegistrationService } from './event-registration.service';
import { EventRegistration } from '../entities/__mocks__/event-registration.entity';

const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockEvent: Partial<EventRegistration> = {
  id: 'uuid-1',
  activityId: 'activity-10',
  userId: 'user-5',
  firstName: 'Beimnet',
  lastName: 'Tesfaye',
  email: 'beimnet@example.com',
  college: 'North Seattle College',
  yearOfStudy: 'Senior',
  isAttended: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('EventRegistrationService', () => {
  let service: EventRegistrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventRegistrationService,
        { provide: 'EventRegistrationRepository', useValue: mockRepository },
      ],
    }).compile();

    service = module.get<EventRegistrationService>(EventRegistrationService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ✅ 1️⃣ Registration creation
  it('should create a registration successfully', async () => {
    mockRepository.findOne.mockResolvedValue(null); // No duplicate registration
    mockRepository.create.mockReturnValue(mockEvent); // Mock the create() method
    mockRepository.save.mockResolvedValue(mockEvent);

    const result = await service.createEventRegistration({
      activityId: mockEvent.activityId,
      userId: mockEvent.userId,
      firstName: mockEvent.firstName,
      lastName: mockEvent.lastName,
      email: mockEvent.email,
      college: mockEvent.college,
      yearOfStudy: mockEvent.yearOfStudy,
      isAttended: mockEvent.isAttended,
    });

    expect(result).toEqual(mockEvent);
  });

  // ✅ 2️⃣ Validation rule
  it('should throw an HttpException if userId is missing', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createEventRegistration({
        activityId: mockEvent.activityId,
        userId: null,
        firstName: '',
        lastName: '',
        email: '',
        college: '',
        yearOfStudy: '',
        isAttended: false,
      }),
    ).rejects.toThrow('Error creating event registration');
  });

  // ✅ 3️⃣ Capacity management
  it('should reject registration if event capacity is full', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    const fullEvent = { ...mockEvent, capacity: 0 };
    mockRepository.create.mockReturnValue(fullEvent);
    mockRepository.save.mockResolvedValue(fullEvent);

    await expect(
      service.createEventRegistration({
        activityId: fullEvent.activityId,
        userId: 'user-22',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        college: 'Engineering',
        yearOfStudy: '2nd Year',
        isAttended: false,
      }),
    ).rejects.toThrow('Error creating event registration');
  });

  // ✅ 4️⃣ Registration update
  it('should update registration successfully', async () => {
    mockRepository.findOne.mockResolvedValue(mockEvent); // Pretend we found the registration
    mockRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.updateEventRegistration('uuid-1', {
      isAttended: true,
    });

    expect(result).toBeTruthy();
  });

  // ✅ 5️⃣ Error handling
  it('should handle generic database errors', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.create.mockReturnValue(mockEvent);
    mockRepository.save.mockRejectedValue(new Error('Unexpected failure'));

    await expect(
      service.createEventRegistration({
        activityId: 'activity-1',
        userId: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        college: 'Engineering',
        yearOfStudy: '2nd Year',
        isAttended: false,
      }),
    ).rejects.toThrow('Error creating event registration');
  });
});