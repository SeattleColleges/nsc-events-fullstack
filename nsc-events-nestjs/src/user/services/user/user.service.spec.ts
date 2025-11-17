import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { UserService, UserSearchFilters } from './user.service';
import {
  User,
  UserDocument,
  GoogleCredentials,
  Role,
} from '../../entities/user.entity';

describe('UserService', () => {
  let service: UserService;

  // Mock data
  const mockUser: UserDocument = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    firstName: 'John',
    lastName: 'Doe',
    pronouns: 'he/him',
    email: 'john.doe@example.com',
    password: 'hashedPassword123',
    role: Role.user,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockAdminUser: UserDocument = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    firstName: 'Jane',
    lastName: 'Smith',
    pronouns: 'she/her',
    email: 'jane.smith@example.com',
    role: Role.admin,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCreatorUser: UserDocument = {
    id: '323e4567-e89b-12d3-a456-426614174002',
    firstName: 'Bob',
    lastName: 'Johnson',
    pronouns: 'they/them',
    email: 'bob.johnson@example.com',
    role: Role.creator,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockUsers: UserDocument[] = [mockUser, mockAdminUser, mockCreatorUser];

  const mockGoogleCredentials: GoogleCredentials = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    idToken: 'mock-id-token',
    expiryDate: 1234567890,
  };

  // Mock QueryBuilder
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    // Reset mock implementations
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllUsers', () => {
    it('should return all users with filtered sensitive data', async () => {
      mockRepository.find.mockResolvedValue(mockUsers);

      const result = await service.getAllUsers();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: mockUser.id,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        pronouns: mockUser.pronouns,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result[0]).not.toHaveProperty('password');
      expect(result[0]).not.toHaveProperty('googleCredentials');
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no users exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getAllUsers();

      expect(result).toEqual([]);
      expect(mockRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should properly filter all sensitive fields', async () => {
      const userWithSensitiveData = {
        ...mockUser,
        password: 'secretPassword',
        googleCredentials: mockGoogleCredentials,
      };
      mockRepository.find.mockResolvedValue([userWithSensitiveData]);

      const result = await service.getAllUsers();

      expect(result[0]).not.toHaveProperty('password');
      expect(result[0]).not.toHaveProperty('googleCredentials');
      expect(result[0]).not.toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('updatedAt');
    });
  });

  describe('searchUsers', () => {
    describe('general search', () => {
      it('should search users by general search term (case-insensitive)', async () => {
        const filters: UserSearchFilters = { search: 'john' };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

        const result = await service.searchUsers(filters);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
          { search: '%john%' },
        );
        expect(result.users).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
        expect(result.totalPages).toBe(1);
      });

      it('should handle search with special characters', async () => {
        const filters: UserSearchFilters = { search: "O'Brien" };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

        await service.searchUsers(filters);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          expect.any(String),
          { search: "%O'Brien%" },
        );
      });
    });

    describe('field-specific search', () => {
      it('should search by firstName (case-insensitive)', async () => {
        const filters: UserSearchFilters = { firstName: 'john' };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

        const result = await service.searchUsers(filters);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'user.firstName ILIKE :firstName',
          { firstName: '%john%' },
        );
        expect(result.users).toHaveLength(1);
      });

      it('should search by lastName (case-insensitive)', async () => {
        const filters: UserSearchFilters = { lastName: 'doe' };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

        const result = await service.searchUsers(filters);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'user.lastName ILIKE :lastName',
          { lastName: '%doe%' },
        );
        expect(result.users).toHaveLength(1);
      });

      it('should search by email (case-insensitive)', async () => {
        const filters: UserSearchFilters = { email: 'example.com' };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([mockUsers, 3]);

        const result = await service.searchUsers(filters);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'user.email ILIKE :email',
          { email: '%example.com%' },
        );
        expect(result.users).toHaveLength(3);
      });

      it('should filter by role', async () => {
        const filters: UserSearchFilters = { role: Role.admin };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([
          [mockAdminUser],
          1,
        ]);

        const result = await service.searchUsers(filters);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'user.role = :role',
          { role: Role.admin },
        );
        expect(result.users).toHaveLength(1);
      });
    });

    describe('combined search filters', () => {
      it('should combine firstName and lastName filters', async () => {
        const filters: UserSearchFilters = {
          firstName: 'john',
          lastName: 'doe',
        };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

        await service.searchUsers(filters);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'user.firstName ILIKE :firstName',
          { firstName: '%john%' },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.lastName ILIKE :lastName',
          { lastName: '%doe%' },
        );
      });

      it('should combine all search filters', async () => {
        const filters: UserSearchFilters = {
          firstName: 'john',
          lastName: 'doe',
          email: 'example.com',
          role: Role.user,
        };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

        await service.searchUsers(filters);

        expect(mockQueryBuilder.where).toHaveBeenCalled();
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
      });

      it('should combine general search with specific filters', async () => {
        const filters: UserSearchFilters = {
          search: 'john',
          role: Role.user,
        };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockUser], 1]);

        await service.searchUsers(filters);

        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          expect.stringContaining('ILIKE :search'),
          expect.any(Object),
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'user.role = :role',
          { role: Role.user },
        );
      });
    });

    describe('pagination', () => {
      it('should use default pagination values (page 1, limit 10)', async () => {
        const filters: UserSearchFilters = {};
        mockQueryBuilder.getManyAndCount.mockResolvedValue([mockUsers, 3]);

        const result = await service.searchUsers(filters);

        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
      });

      it('should handle custom page and limit', async () => {
        const filters: UserSearchFilters = { page: 2, limit: 5 };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([
          mockUsers.slice(0, 2),
          7,
        ]);

        const result = await service.searchUsers(filters);

        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5); // (2-1) * 5
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
        expect(result.page).toBe(2);
        expect(result.limit).toBe(5);
        expect(result.totalPages).toBe(2); // Math.ceil(7/5)
      });

      it('should calculate total pages correctly', async () => {
        const filters: UserSearchFilters = { limit: 2 };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([
          mockUsers.slice(0, 2),
          10,
        ]);

        const result = await service.searchUsers(filters);

        expect(result.totalPages).toBe(5); // Math.ceil(10/2)
      });

      it('should handle page 3 with correct skip value', async () => {
        const filters: UserSearchFilters = { page: 3, limit: 10 };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 25]);

        await service.searchUsers(filters);

        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20); // (3-1) * 10
      });

      it('should handle edge case with 0 results', async () => {
        const filters: UserSearchFilters = { page: 1, limit: 10 };
        mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

        const result = await service.searchUsers(filters);

        expect(result.total).toBe(0);
        expect(result.totalPages).toBe(0);
      });
    });

    describe('sorting', () => {
      it('should always sort by lastName in ascending order', async () => {
        const filters: UserSearchFilters = {};
        mockQueryBuilder.getManyAndCount.mockResolvedValue([mockUsers, 3]);

        await service.searchUsers(filters);

        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
          'user.lastName',
          'ASC',
        );
      });
    });

    describe('error handling', () => {
      it('should throw HttpException on database error', async () => {
        const filters: UserSearchFilters = { firstName: 'john' };
        mockQueryBuilder.getManyAndCount.mockRejectedValue(
          new Error('DB Error'),
        );

        await expect(service.searchUsers(filters)).rejects.toThrow(
          HttpException,
        );
        await expect(service.searchUsers(filters)).rejects.toThrow(
          'Error retrieving users',
        );
      });

      it('should throw HttpException with INTERNAL_SERVER_ERROR status', async () => {
        const filters: UserSearchFilters = {};
        mockQueryBuilder.getManyAndCount.mockRejectedValue(
          new Error('Connection lost'),
        );

        try {
          await service.searchUsers(filters);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        }
      });
    });

    describe('empty filters', () => {
      it('should return all users when no filters provided', async () => {
        const filters: UserSearchFilters = {};
        mockQueryBuilder.getManyAndCount.mockResolvedValue([mockUsers, 3]);

        const result = await service.searchUsers(filters);

        expect(result.users).toHaveLength(3);
        expect(result.total).toBe(3);
      });
    });
  });

  describe('getUserById', () => {
    it('should return a user by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById('non-existent-id')).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw HttpException on database error', async () => {
      mockRepository.findOne.mockRejectedValue(new Error('DB Error'));

      await expect(service.getUserById(mockUser.id)).rejects.toThrow(
        HttpException,
      );
      await expect(service.getUserById(mockUser.id)).rejects.toThrow(
        'Error retrieving user',
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should return a user by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
    });

    it('should return null when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should throw HttpException on database error', async () => {
      mockRepository.findOne.mockRejectedValue(new Error('DB Error'));

      await expect(service.getUserByEmail(mockUser.email)).rejects.toThrow(
        HttpException,
      );
    });

    it('should handle email with special characters', async () => {
      const specialEmail = 'test+tag@example.com';
      mockRepository.findOne.mockResolvedValue(null);

      await service.getUserByEmail(specialEmail);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: specialEmail },
      });
    });
  });

  describe('createUser', () => {
    it('should create and return a new user', async () => {
      const userData: Partial<User> = {
        firstName: 'New',
        lastName: 'User',
        pronouns: 'they/them',
        email: 'new@example.com',
        role: Role.user,
      };
      const createdUser = { ...mockUser, ...userData };

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.createUser(userData);

      expect(result).toEqual(createdUser);
      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(mockRepository.save).toHaveBeenCalledWith(createdUser);
    });

    it('should throw HttpException on database error', async () => {
      const userData: Partial<User> = {
        email: 'new@example.com',
      };
      mockRepository.create.mockReturnValue(userData as User);
      mockRepository.save.mockRejectedValue(new Error('DB Error'));

      await expect(service.createUser(userData)).rejects.toThrow(HttpException);
      await expect(service.createUser(userData)).rejects.toThrow(
        'Error creating user',
      );
    });

    it('should handle creating user with minimal data', async () => {
      const minimalUserData: Partial<User> = {
        email: 'minimal@example.com',
        firstName: 'Min',
        lastName: 'User',
        pronouns: 'he/him',
      };
      const createdUser = { ...mockUser, ...minimalUserData };

      mockRepository.create.mockReturnValue(createdUser);
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.createUser(minimalUserData);

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalledWith(minimalUserData);
    });
  });

  describe('updateUser', () => {
    it('should update and return user', async () => {
      const updateData: Partial<User> = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const updatedUser = { ...mockUser, ...updateData };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateUser(mockUser.id, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should properly sanitize and update user data', async () => {
      const updateData: Partial<User> = {
        email: 'newemail@example.com',
        pronouns: 'she/her',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({ ...mockUser, ...updateData });

      await service.updateUser(mockUser.id, updateData);

      const saveCall = mockRepository.save.mock.calls[0][0];
      expect(saveCall).toMatchObject(updateData);
    });

    it('should throw HttpException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUser('non-existent-id', { firstName: 'Test' }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw HttpException on database save error', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.updateUser(mockUser.id, { firstName: 'Test' }),
      ).rejects.toThrow(HttpException);
      await expect(
        service.updateUser(mockUser.id, { firstName: 'Test' }),
      ).rejects.toThrow('Error updating user');
    });

    it('should handle updating multiple fields at once', async () => {
      const multipleUpdates: Partial<User> = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        pronouns: 'xe/xem',
        email: 'updated@example.com',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        ...multipleUpdates,
      });

      const result = await service.updateUser(mockUser.id, multipleUpdates);

      expect(result).toMatchObject(multipleUpdates);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.deleteUser(mockUser.id);

      expect(mockRepository.delete).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw HttpException when user not found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.deleteUser('non-existent-id')).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw HttpException on database error', async () => {
      mockRepository.delete.mockRejectedValue(new Error('DB Error'));

      await expect(service.deleteUser(mockUser.id)).rejects.toThrow(
        HttpException,
      );
      await expect(service.deleteUser(mockUser.id)).rejects.toThrow(
        'Error deleting user',
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update user role to admin', async () => {
      const updatedUser = { ...mockUser, role: Role.admin };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateUserRole(mockUser.id, Role.admin);

      expect(result.role).toBe(Role.admin);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should update user role to creator', async () => {
      const updatedUser = { ...mockUser, role: Role.creator };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateUserRole(mockUser.id, Role.creator);

      expect(result.role).toBe(Role.creator);
    });

    it('should update user role to user (downgrade from admin)', async () => {
      const updatedUser = { ...mockAdminUser, role: Role.user };
      mockRepository.findOne.mockResolvedValue(mockAdminUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateUserRole(mockAdminUser.id, Role.user);

      expect(result.role).toBe(Role.user);
    });

    it('should throw HttpException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUserRole('non-existent-id', Role.admin),
      ).rejects.toThrow(HttpException);
    });

    it('should throw HttpException on database error', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.updateUserRole(mockUser.id, Role.admin),
      ).rejects.toThrow(HttpException);
      await expect(
        service.updateUserRole(mockUser.id, Role.admin),
      ).rejects.toThrow('Error updating user role');
    });

    it('should preserve other user data when updating role', async () => {
      const updatedUser = { ...mockUser, role: Role.creator };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateUserRole(mockUser.id, Role.creator);

      expect(result.firstName).toBe(mockUser.firstName);
      expect(result.lastName).toBe(mockUser.lastName);
      expect(result.email).toBe(mockUser.email);
    });
  });

  describe('updateGoogleCredentials', () => {
    it('should update Google credentials successfully', async () => {
      const updatedUser = {
        ...mockUser,
        googleCredentials: mockGoogleCredentials,
      };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateGoogleCredentials(
        mockUser.id,
        mockGoogleCredentials,
      );

      expect(result.googleCredentials).toEqual(mockGoogleCredentials);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw HttpException when user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateGoogleCredentials(
          'non-existent-id',
          mockGoogleCredentials,
        ),
      ).rejects.toThrow(HttpException);
    });

    it('should throw HttpException on database error', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.updateGoogleCredentials(mockUser.id, mockGoogleCredentials),
      ).rejects.toThrow(HttpException);
      await expect(
        service.updateGoogleCredentials(mockUser.id, mockGoogleCredentials),
      ).rejects.toThrow('Error updating Google credentials');
    });

    it('should handle partial Google credentials', async () => {
      const partialCredentials: GoogleCredentials = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      const updatedUser = {
        ...mockUser,
        googleCredentials: partialCredentials,
      };

      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateGoogleCredentials(
        mockUser.id,
        partialCredentials,
      );

      expect(result.googleCredentials).toEqual(partialCredentials);
    });

    it('should preserve other user data when updating credentials', async () => {
      const updatedUser = {
        ...mockUser,
        googleCredentials: mockGoogleCredentials,
      };
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateGoogleCredentials(
        mockUser.id,
        mockGoogleCredentials,
      );

      expect(result.firstName).toBe(mockUser.firstName);
      expect(result.email).toBe(mockUser.email);
      expect(result.role).toBe(mockUser.role);
    });

    it('should update existing credentials with new values', async () => {
      const existingCredentials: GoogleCredentials = {
        accessToken: 'old-token',
        refreshToken: 'old-refresh',
      };
      const userWithCredentials = {
        ...mockUser,
        googleCredentials: existingCredentials,
      };
      const updatedUser = {
        ...mockUser,
        googleCredentials: mockGoogleCredentials,
      };

      mockRepository.findOne.mockResolvedValue(userWithCredentials);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateGoogleCredentials(
        mockUser.id,
        mockGoogleCredentials,
      );

      expect(result.googleCredentials?.accessToken).toBe(
        mockGoogleCredentials.accessToken,
      );
      expect(result.googleCredentials?.refreshToken).toBe(
        mockGoogleCredentials.refreshToken,
      );
    });
  });

  describe('Edge Cases and Integration Scenarios', () => {
    it('should handle users with all optional fields', async () => {
      const minimalUser: UserDocument = {
        id: '456',
        firstName: 'Min',
        lastName: 'User',
        pronouns: 'they/them',
        email: 'min@example.com',
        role: Role.user,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(minimalUser);

      const result = await service.getUserById('456');

      expect(result).toEqual(minimalUser);
      expect(result.password).toBeUndefined();
      expect(result.googleCredentials).toBeUndefined();
    });

    it('should handle concurrent updates properly', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({
        ...mockUser,
        firstName: 'Updated',
      });

      const promise1 = service.updateUser(mockUser.id, { firstName: 'First' });
      const promise2 = service.updateUser(mockUser.id, { lastName: 'Second' });

      await Promise.all([promise1, promise2]);

      expect(mockRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should handle search with very long strings', async () => {
      const longString = 'a'.repeat(1000);
      const filters: UserSearchFilters = { firstName: longString };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.searchUsers(filters);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.firstName ILIKE :firstName',
        { firstName: `%${longString}%` },
      );
    });
  });
});
