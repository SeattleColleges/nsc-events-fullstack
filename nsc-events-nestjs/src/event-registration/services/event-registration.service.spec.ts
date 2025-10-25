import { Test, TestingModule } from '@nestjs/testing';
import { EventRegistrationService } from './event-registration.service';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

// Inline mock repository
const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  remove: jest.fn(),
};

// Sample mock data
const mockRegistration = {
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

describe('EventRegistrationService (User-focused)', () => {
  let service: EventRegistrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventRegistrationService,
        {
          provide: 'EventRegistrationRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EventRegistrationService>(EventRegistrationService);
  });

  afterEach(() => jest.clearAllMocks());

  // 1️⃣ Definition
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 2️⃣ Create
  it('should create a new registration', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.create.mockReturnValue(mockRegistration);
    mockRepository.save.mockResolvedValue(mockRegistration);

    const result = await service.createEventRegistration(mockRegistration);
    expect(result).toEqual(mockRegistration);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  // 3️⃣ Get by ID
  it('should return registration by id', async () => {
    mockRepository.findOne.mockResolvedValue(mockRegistration);
    const result = await service.getEventRegistrationById('uuid-1');
    expect(result).toEqual(mockRegistration);
  });

  // 4️⃣ Handle not found
  it('should throw NotFoundException if registration not found', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    await expect(
      service.getEventRegistrationById('unknown-id'),
    ).rejects.toThrow(NotFoundException);
  });

  // 5️⃣ Get by userId
  it('should return all registrations for a user', async () => {
    mockRepository.find.mockResolvedValue([mockRegistration]);
    const result = await service.getEventRegistrationsByUserId('user-5');
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('user-5');
  });

  // 6️⃣ Update registration
  it('should update registration successfully', async () => {
    jest
      .spyOn(service, 'getEventRegistrationById')
      .mockResolvedValue(mockRegistration);
    mockRepository.save.mockResolvedValue({
      ...mockRegistration,
      isAttended: true,
    });

    const result = await service.updateEventRegistration('uuid-1', {
      isAttended: true,
    });

    expect(result.isAttended).toBe(true);
  });

  // 7️⃣ Delete registration
  it('should delete registration successfully', async () => {
    jest
      .spyOn(service, 'getEventRegistrationById')
      .mockResolvedValue(mockRegistration);
    mockRepository.remove.mockResolvedValue(undefined);

    await service.deleteEventRegistration('uuid-1');
    expect(mockRepository.remove).toHaveBeenCalledWith(mockRegistration);
  });

  // 8️⃣ Mark attendance
  it('should mark attendance successfully', async () => {
    jest
      .spyOn(service, 'getEventRegistrationById')
      .mockResolvedValue(mockRegistration);
    mockRepository.save.mockResolvedValue({
      ...mockRegistration,
      isAttended: true,
    });

    const result = await service.markAttendance('uuid-1', true);
    expect(result.isAttended).toBe(true);
  });

  // 9️⃣ Get attendees for activity
  it('should return attendees for a given activity', async () => {
    mockRepository.find.mockResolvedValue([mockRegistration]);
    const result = await service.getAttendeesForActivity('activity-10');
    expect(result).toHaveLength(1);
  });

  // 🔟 Get registration stats
  it('should return registration stats correctly', async () => {
    mockRepository.count
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(7); // attended

    const stats = await service.getRegistrationStats('activity-10');
    expect(stats.totalRegistrations).toBe(10);
    expect(stats.totalAttendees).toBe(7);
    expect(stats.attendanceRate).toBe(70);
  });
});