import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { EventRegistrationService } from './event-registration.service';
import { EventRegistration } from '../entities/event-registration.entity';

// ---- Typed mock for repository ----
type MockRepo = Partial<Record<keyof Repository<EventRegistration>, jest.Mock>>;
const createMockRepo = (): MockRepo => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
});

// ---- Mock data ----
const mockReg: EventRegistration = {
  id: 'r1',
  activityId: 'a1',
  userId: 'u1',
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
  let repo: MockRepo;

  beforeEach(async () => {
    repo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventRegistrationService,
        {
          provide: getRepositoryToken(EventRegistration),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<EventRegistrationService>(EventRegistrationService);
  });

  afterEach(() => jest.clearAllMocks());

  // --- CREATE ---
  it('should create a registration successfully', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(null);
    (repo.create as jest.Mock).mockReturnValue(mockReg);
    (repo.save as jest.Mock).mockResolvedValue(mockReg);

    const result = await service.createEventRegistration(mockReg);
    expect(result).toEqual(mockReg);
  });

  it('should throw BadRequest if user already registered', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(mockReg);

    await expect(service.createEventRegistration(mockReg)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should wrap unexpected errors during create', async () => {
    (repo.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

    await expect(service.createEventRegistration(mockReg)).rejects.toThrow(
      HttpException,
    );
  });

  // --- GET ALL ---
  it('should get all registrations', async () => {
    (repo.find as jest.Mock).mockResolvedValue([mockReg]);
    const result = await service.getAllEventRegistrations();
    expect(result).toEqual([mockReg]);
  });

  it('should handle DB errors on getAll', async () => {
    (repo.find as jest.Mock).mockRejectedValue(new Error('fail'));
    await expect(service.getAllEventRegistrations()).rejects.toThrow(
      HttpException,
    );
  });

  // --- GET BY ID ---
  it('should get registration by id', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(mockReg);
    const result = await service.getEventRegistrationById('r1');
    expect(result).toEqual(mockReg);
  });

  it('should throw NotFound when registration not found', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.getEventRegistrationById('x')).rejects.toThrow(
      NotFoundException,
    );
  });

  // --- GET BY ACTIVITY ---
  it('should get registrations by activityId', async () => {
    (repo.find as jest.Mock).mockResolvedValue([mockReg]);
    const result = await service.getEventRegistrationsByActivityId('a1');
    expect(result).toEqual([mockReg]);
  });

  it('should handle DB errors on getByActivity', async () => {
    (repo.find as jest.Mock).mockRejectedValue(new Error('fail'));
    await expect(
      service.getEventRegistrationsByActivityId('a1'),
    ).rejects.toThrow(HttpException);
  });

  // --- GET BY USER ---
  it('should get registrations by userId', async () => {
    (repo.find as jest.Mock).mockResolvedValue([mockReg]);
    const result = await service.getEventRegistrationsByUserId('u1');
    expect(result).toEqual([mockReg]);
  });

  it('should handle DB errors on getByUser', async () => {
    (repo.find as jest.Mock).mockRejectedValue(new Error('fail'));
    await expect(service.getEventRegistrationsByUserId('u1')).rejects.toThrow(
      HttpException,
    );
  });

  // --- UPDATE ---
  it('should update registration successfully', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(mockReg);
    (repo.save as jest.Mock).mockResolvedValue({
      ...mockReg,
      isAttended: true,
    });
    const result = await service.updateEventRegistration('r1', {
      isAttended: true,
    });
    expect(result.isAttended).toBe(true);
  });

  it('should throw NotFound if updating non-existent registration', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(
      service.updateEventRegistration('x', { isAttended: true }),
    ).rejects.toThrow(NotFoundException);
  });

  // --- DELETE ---
  it('should delete registration successfully', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(mockReg);
    (repo.remove as jest.Mock).mockResolvedValue(undefined);
    await expect(
      service.deleteEventRegistration('r1'),
    ).resolves.toBeUndefined();
  });

  it('should throw NotFound if deleting non-existent registration', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.deleteEventRegistration('x')).rejects.toThrow(
      NotFoundException,
    );
  });

  // --- MARK ATTENDANCE ---
  it('should mark attendance successfully', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(mockReg);
    (repo.save as jest.Mock).mockResolvedValue({
      ...mockReg,
      isAttended: true,
    });
    const result = await service.markAttendance('r1', true);
    expect(result.isAttended).toBe(true);
  });

  it('should throw NotFound on missing id for markAttendance', async () => {
    (repo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.markAttendance('x', true)).rejects.toThrow(
      NotFoundException,
    );
  });

  // --- GET ATTENDEES ---
  it('should get attendees for an activity', async () => {
    (repo.find as jest.Mock).mockResolvedValue([mockReg]);
    const result = await service.getAttendeesForActivity('a1');
    expect(result).toEqual([mockReg]);
  });

  it('should handle DB error on getAttendees', async () => {
    (repo.find as jest.Mock).mockRejectedValue(new Error('fail'));
    await expect(service.getAttendeesForActivity('a1')).rejects.toThrow(
      HttpException,
    );
  });

  // --- STATS ---
  it('should get registration stats successfully', async () => {
    (repo.count as jest.Mock)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5);
    const stats = await service.getRegistrationStats('a1');
    expect(stats).toEqual({
      totalRegistrations: 10,
      totalAttendees: 5,
      attendanceRate: 50,
    });
  });

  it('should handle DB error on getStats', async () => {
    (repo.count as jest.Mock).mockRejectedValue(new Error('fail'));
    await expect(service.getRegistrationStats('a1')).rejects.toThrow(
      HttpException,
    );
  });
});
