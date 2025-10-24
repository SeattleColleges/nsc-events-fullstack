import { Test, TestingModule } from '@nestjs/testing';
import { EventRegistrationService } from './event-registration.service';

// inline mock repo
const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

// sample mock data
const mockEvent = {
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

  it('should create a registration successfully', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.create.mockReturnValue(mockEvent);
    mockRepository.save.mockResolvedValue(mockEvent);

    const result = await service.createEventRegistration(mockEvent);
    expect(result).toEqual(mockEvent);
  });

  it('should handle missing userId case', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.create.mockReturnValue(mockEvent);
    mockRepository.save.mockResolvedValue(mockEvent);

    const result = await service.createEventRegistration({
      ...mockEvent,
      userId: null,
    });
    expect(result).toBeDefined();
  });

  it('should handle capacity check gracefully', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.create.mockReturnValue({ ...mockEvent, capacity: 0 });
    mockRepository.save.mockResolvedValue({ ...mockEvent, capacity: 0 });

    const result = await service.createEventRegistration({
      ...mockEvent,
      userId: 'user-22',
    });
    expect(result).toBeDefined();
  });

  it('should update registration successfully', async () => {
    mockRepository.findOne.mockResolvedValue(mockEvent);
    mockRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.updateEventRegistration('uuid-1', {
      isAttended: true,
    });
    expect(result).toBeTruthy();
  });

  it('should handle database errors', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.create.mockReturnValue(mockEvent);
    mockRepository.save.mockRejectedValue(new Error('Database error'));

    await expect(
      service.createEventRegistration(mockEvent),
    ).rejects.toThrow('Error creating event registration');
  });
});