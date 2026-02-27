import { Logger } from '@nestjs/common';
import {
  maskEmail,
  maskName,
  maskUUID,
  sanitizeString,
  sanitizeUrl,
  sanitizeUserForLogging,
  sanitizeActivityForLogging,
  sanitizeEventForLogging,
  removeSensitiveFields,
  sanitizeRequestBody,
  sanitizeForLogging,
  secureLogger,
  initializeConsoleSanitization,
  restoreConsole,
} from './logging-sanitizer';

describe('LoggingSanitizer', () => {
  describe('maskEmail', () => {
    it('should mask email address showing only first character and domain', () => {
      const result = maskEmail('john.doe@example.com');

      expect(result).toBe('j*******@example.com');
    });

    it('should handle short email local parts', () => {
      const result = maskEmail('a@test.com');

      expect(result).toBe('a**@test.com');
    });

    it('should handle two character local parts', () => {
      const result = maskEmail('ab@test.com');

      expect(result).toBe('a**@test.com');
    });

    it('should return empty string for null input', () => {
      const result = maskEmail(null as unknown as string);

      expect(result).toBe('');
    });

    it('should return empty string for undefined input', () => {
      const result = maskEmail(undefined as unknown as string);

      expect(result).toBe('');
    });

    it('should return empty string for empty string input', () => {
      const result = maskEmail('');

      expect(result).toBe('');
    });

    it('should handle invalid email format without @ symbol', () => {
      const result = maskEmail('invalidemail');

      expect(result).toBe('***@***');
    });

    it('should preserve domain with subdomains', () => {
      const result = maskEmail('user@mail.example.com');

      expect(result).toBe('u***@mail.example.com');
    });
  });

  describe('maskName', () => {
    it('should mask name showing only first character', () => {
      const result = maskName('John');

      expect(result).toBe('J***');
    });

    it('should handle short names with minimum mask length', () => {
      const result = maskName('Jo');

      expect(result).toBe('J**');
    });

    it('should return single character names as-is', () => {
      const result = maskName('J');

      expect(result).toBe('J');
    });

    it('should return empty string for null input', () => {
      const result = maskName(null as unknown as string);

      expect(result).toBe('');
    });

    it('should return empty string for undefined input', () => {
      const result = maskName(undefined as unknown as string);

      expect(result).toBe('');
    });

    it('should return empty string for empty string input', () => {
      const result = maskName('');

      expect(result).toBe('');
    });

    it('should handle long names', () => {
      const result = maskName('Alexander');

      expect(result).toBe('A********');
    });
  });

  describe('maskUUID', () => {
    it('should mask valid UUID showing partial first and last segments', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = maskUUID(uuid);

      expect(result).toBe('123e****-****-****-****-******174000');
    });

    it('should return non-UUID strings unchanged', () => {
      const notUuid = 'not-a-valid-uuid';
      const result = maskUUID(notUuid);

      expect(result).toBe(notUuid);
    });

    it('should return null for null input', () => {
      const result = maskUUID(null as unknown as string);

      expect(result).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      const result = maskUUID(undefined as unknown as string);

      expect(result).toBeUndefined();
    });

    it('should return non-string types unchanged', () => {
      const result = maskUUID(12345 as unknown as string);

      expect(result).toBe(12345);
    });

    it('should handle uppercase UUIDs', () => {
      const uuid = '123E4567-E89B-12D3-A456-426614174000';
      const result = maskUUID(uuid);

      expect(result).toBe('123E****-****-****-****-******174000');
    });

    it('should return invalid UUID format unchanged', () => {
      const invalidUuid = '123e4567-e89b-12d3-a456'; // Missing last segment
      const result = maskUUID(invalidUuid);

      expect(result).toBe(invalidUuid);
    });

    it('should return UUID with wrong number of parts unchanged', () => {
      // This passes regex but has wrong number of parts after split
      const wrongParts = '12345678-1234-1234-1234';
      const result = maskUUID(wrongParts);

      expect(result).toBe(wrongParts);
    });
  });

  describe('sanitizeString', () => {
    it('should mask email addresses in text', () => {
      const input = 'Contact us at john.doe@example.com for help';
      const result = sanitizeString(input);

      expect(result).toContain('j*******@example.com');
      expect(result).not.toContain('john.doe@example.com');
    });

    it('should mask Bearer tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const result = sanitizeString(input);

      expect(result).toBe('Authorization: Bearer [SECURED]');
    });

    it('should mask JWT tokens', () => {
      const input = 'JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
      const result = sanitizeString(input);

      expect(result).toBe('JWT [SECURED]');
    });

    it('should mask token: prefix values', () => {
      const input = 'token: abc123secret';
      const result = sanitizeString(input);

      expect(result).toBe('token: [SECURED]');
    });

    it('should mask apikey: prefix values', () => {
      const input = 'apikey: sk-123456789';
      const result = sanitizeString(input);

      expect(result).toBe('apikey: [SECURED]');
    });

    it('should mask api_key: prefix values', () => {
      const input = 'api_key: my-secret-key';
      const result = sanitizeString(input);

      expect(result).toBe('api_key: [SECURED]');
    });

    it('should mask SSN patterns', () => {
      const input = 'SSN: 123-45-6789';
      const result = sanitizeString(input);

      expect(result).toBe('SSN: XXX-XX-XXXX');
    });

    it('should mask SSN without dashes', () => {
      const input = 'SSN: 123 45 6789';
      const result = sanitizeString(input);

      expect(result).toBe('SSN: XXX-XX-XXXX');
    });

    it('should mask phone numbers', () => {
      const input = 'Call me at 555-123-4567';
      const result = sanitizeString(input);

      expect(result).toBe('Call me at [PHONE]');
    });

    it('should mask phone numbers in standard format with spaces', () => {
      // The regex has word boundaries \b that work with standard formats
      const input = 'Phone: 555 123 4567';
      const result = sanitizeString(input);

      expect(result).toBe('Phone: [PHONE]');
    });

    it('should mask compact phone numbers', () => {
      // Test the basic 10-digit pattern that the regex handles
      const input = 'Call 5551234567 now';
      const result = sanitizeString(input);

      expect(result).toBe('Call [PHONE] now');
    });

    it('should return null/undefined input unchanged', () => {
      expect(sanitizeString(null as unknown as string)).toBeNull();
      expect(sanitizeString(undefined as unknown as string)).toBeUndefined();
    });

    it('should return empty string unchanged', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle multiple sensitive patterns in one string', () => {
      const input = 'User john@test.com called 555-123-4567 with token: secret123';
      const result = sanitizeString(input);

      expect(result).toContain('j***@test.com');
      expect(result).toContain('[PHONE]');
      expect(result).toContain('token: [SECURED]');
    });
  });

  describe('sanitizeUrl', () => {
    it('should mask UUIDs in URL paths', () => {
      const url = '/api/users/123e4567-e89b-12d3-a456-426614174000';
      const result = sanitizeUrl(url);

      expect(result).toBe('/api/users/123e****-****-****-****-******174000');
    });

    it('should mask multiple UUIDs in URL', () => {
      const url = '/api/users/123e4567-e89b-12d3-a456-426614174000/events/987fcdeb-51a2-3bc4-d567-890123456789';
      const result = sanitizeUrl(url);

      expect(result).toContain('123e****-****-****-****-******174000');
      expect(result).toContain('987f****-****-****-****-******456789');
    });

    it('should return null for null input', () => {
      const result = sanitizeUrl(null as unknown as string);

      expect(result).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      const result = sanitizeUrl(undefined as unknown as string);

      expect(result).toBeUndefined();
    });

    it('should return URLs without UUIDs unchanged', () => {
      const url = '/api/users/search?name=john';
      const result = sanitizeUrl(url);

      expect(result).toBe(url);
    });
  });

  describe('sanitizeUserForLogging', () => {
    it('should sanitize user object with all fields', () => {
      const user = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'secret123',
        role: 'admin',
      };

      const result = sanitizeUserForLogging(user);

      expect(result.id).toBe(user.id);
      expect(result.firstName).toBe('J***');
      expect(result.lastName).toBe('D**');
      expect(result.email).toBe('j*******@example.com');
      expect(result.role).toBe('admin');
      expect(result).not.toHaveProperty('password');
    });

    it('should return null for null input', () => {
      const result = sanitizeUserForLogging(null);

      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = sanitizeUserForLogging(undefined);

      expect(result).toBeNull();
    });

    it('should handle user with _id (MongoDB style)', () => {
      const user = {
        _id: { toString: () => 'mongo-object-id-123' },
        firstName: 'Jane',
        email: 'jane@test.com',
        role: 'user',
      };

      const result = sanitizeUserForLogging(user);

      expect(result.id).toBe('mongo-object-id-123');
    });

    it('should handle user without id or _id', () => {
      const user = {
        firstName: 'Test',
        email: 'test@test.com',
      };

      const result = sanitizeUserForLogging(user);

      expect(result.id).toBeUndefined();
    });

    it('should handle missing optional fields', () => {
      const user = {
        id: '123',
      };

      const result = sanitizeUserForLogging(user);

      expect(result.id).toBe('123');
      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
      expect(result.email).toBe('');
    });
  });

  describe('sanitizeActivityForLogging', () => {
    it('should sanitize activity object', () => {
      const activity = {
        id: 'activity-123',
        title: 'Test Activity',
        description: 'Activity description',
        category: 'Sports',
        location: 'Seattle',
        createdByUser: { id: 'user-123' },
        updatedByUser: { id: 'user-456' },
      };

      const result = sanitizeActivityForLogging(activity);

      expect(result.id).toBe('activity-123');
      expect(result.title).toBe('Test Activity');
      expect(result.description).toBe('Activity description');
      expect(result.category).toBe('Sports');
      expect(result.location).toBe('Seattle');
      expect(result.createdByUserId).toBe('user-123');
      expect(result.updatedByUserId).toBe('user-456');
    });

    it('should return null for null input', () => {
      const result = sanitizeActivityForLogging(null);

      expect(result).toBeNull();
    });

    it('should handle snake_case user id fields', () => {
      const activity = {
        id: 'activity-123',
        created_by_user_id: 'user-789',
        updated_by_user_id: 'user-012',
      };

      const result = sanitizeActivityForLogging(activity);

      expect(result.createdByUserId).toBe('user-789');
      expect(result.updatedByUserId).toBe('user-012');
    });

    it('should handle missing user references', () => {
      const activity = {
        id: 'activity-123',
        title: 'Test',
      };

      const result = sanitizeActivityForLogging(activity);

      expect(result.createdByUserId).toBeUndefined();
      expect(result.updatedByUserId).toBeUndefined();
    });
  });

  describe('sanitizeEventForLogging', () => {
    it('should sanitize event object', () => {
      const eventDate = new Date('2024-01-15');
      const event = {
        id: 'event-123',
        title: 'Test Event',
        description: 'Event description',
        location: 'Seattle',
        eventDate: eventDate,
        createdByUser: { id: 'user-123' },
        updatedByUser: { id: 'user-456' },
      };

      const result = sanitizeEventForLogging(event);

      expect(result.id).toBe('event-123');
      expect(result.title).toBe('Test Event');
      expect(result.description).toBe('Event description');
      expect(result.location).toBe('Seattle');
      expect(result.eventDate).toBe(eventDate);
      expect(result.createdByUserId).toBe('user-123');
      expect(result.updatedByUserId).toBe('user-456');
    });

    it('should return null for null input', () => {
      const result = sanitizeEventForLogging(null);

      expect(result).toBeNull();
    });

    it('should handle snake_case user id fields', () => {
      const event = {
        id: 'event-123',
        created_by_user_id: 'user-789',
        updated_by_user_id: 'user-012',
      };

      const result = sanitizeEventForLogging(event);

      expect(result.createdByUserId).toBe('user-789');
      expect(result.updatedByUserId).toBe('user-012');
    });
  });

  describe('removeSensitiveFields', () => {
    it('should remove default sensitive fields', () => {
      const obj = {
        id: '123',
        name: 'Test',
        password: 'secret',
        resetPasswordToken: 'token123',
        resetPasswordExpires: new Date(),
        googleCredentials: 'creds',
        googleId: 'google123',
        passwordHash: 'hash',
        salt: 'salt123',
        authToken: 'auth',
        verificationToken: 'verify',
        currentPassword: 'current',
        newPassword: 'new',
        newPasswordConfirm: 'confirm',
        confirmPassword: 'confirm2',
        secret: 'mysecret',
        apiKey: 'api123',
        authorization: 'Bearer xyz',
        credit_card: '4111111111111111',
        cardNumber: '4111111111111111',
        cvv: '123',
      };

      const result = removeSensitiveFields(obj);

      expect(result.id).toBe('123');
      expect(result.name).toBe('Test');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('resetPasswordToken');
      expect(result).not.toHaveProperty('resetPasswordExpires');
      expect(result).not.toHaveProperty('googleCredentials');
      expect(result).not.toHaveProperty('googleId');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('salt');
      expect(result).not.toHaveProperty('authToken');
      expect(result).not.toHaveProperty('verificationToken');
      expect(result).not.toHaveProperty('currentPassword');
      expect(result).not.toHaveProperty('newPassword');
      expect(result).not.toHaveProperty('newPasswordConfirm');
      expect(result).not.toHaveProperty('confirmPassword');
      expect(result).not.toHaveProperty('secret');
      expect(result).not.toHaveProperty('apiKey');
      expect(result).not.toHaveProperty('authorization');
      expect(result).not.toHaveProperty('credit_card');
      expect(result).not.toHaveProperty('cardNumber');
      expect(result).not.toHaveProperty('cvv');
    });

    it('should remove additional custom sensitive fields', () => {
      const obj = {
        id: '123',
        customSecret: 'secret',
        anotherSensitive: 'data',
      };

      const result = removeSensitiveFields(obj, ['customSecret', 'anotherSensitive']);

      expect(result.id).toBe('123');
      expect(result).not.toHaveProperty('customSecret');
      expect(result).not.toHaveProperty('anotherSensitive');
    });

    it('should return null for null input', () => {
      const result = removeSensitiveFields(null);

      expect(result).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      const result = removeSensitiveFields(undefined);

      expect(result).toBeUndefined();
    });

    it('should not modify original object', () => {
      const original = { id: '123', password: 'secret' };
      removeSensitiveFields(original);

      expect(original.password).toBe('secret');
    });
  });

  describe('sanitizeRequestBody', () => {
    it('should mask email in request body', () => {
      const body = { email: 'test@example.com' };
      const result = sanitizeRequestBody(body);

      expect(result.email).toBe('t***@example.com');
    });

    it('should mask firstName and lastName', () => {
      const body = {
        firstName: 'John',
        lastName: 'Doe',
      };
      const result = sanitizeRequestBody(body);

      expect(result.firstName).toBe('J***');
      expect(result.lastName).toBe('D**');
    });

    it('should replace sensitive fields with [secured]', () => {
      const body = {
        email: 'test@test.com',
        password: 'secret123',
        token: 'jwt-token',
        refreshToken: 'refresh-token',
        currentPassword: 'current',
        newPassword: 'new',
        newPasswordConfirm: 'confirm',
        confirmPassword: 'confirm2',
        secret: 'mysecret',
        apiKey: 'api123',
        authorization: 'Bearer xyz',
        credit_card: '4111111111111111',
        cardNumber: '4111111111111111',
        cvv: '123',
      };

      const result = sanitizeRequestBody(body);

      expect(result.password).toBe('[secured]');
      expect(result.token).toBe('[secured]');
      expect(result.refreshToken).toBe('[secured]');
      expect(result.currentPassword).toBe('[secured]');
      expect(result.newPassword).toBe('[secured]');
      expect(result.newPasswordConfirm).toBe('[secured]');
      expect(result.confirmPassword).toBe('[secured]');
      expect(result.secret).toBe('[secured]');
      expect(result.apiKey).toBe('[secured]');
      expect(result.authorization).toBe('[secured]');
      expect(result.credit_card).toBe('[secured]');
      expect(result.cardNumber).toBe('[secured]');
      expect(result.cvv).toBe('[secured]');
    });

    it('should return null for null input', () => {
      const result = sanitizeRequestBody(null);

      expect(result).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      const result = sanitizeRequestBody(undefined);

      expect(result).toBeUndefined();
    });

    it('should not modify original object', () => {
      const original = { email: 'test@test.com', password: 'secret' };
      sanitizeRequestBody(original);

      expect(original.email).toBe('test@test.com');
      expect(original.password).toBe('secret');
    });

    it('should handle empty object', () => {
      const result = sanitizeRequestBody({});

      expect(result).toEqual({});
    });
  });

  describe('sanitizeForLogging', () => {
    describe('null/undefined handling', () => {
      it('should return null for null input', () => {
        const result = sanitizeForLogging(null);

        expect(result).toBeNull();
      });

      it('should return undefined for undefined input', () => {
        const result = sanitizeForLogging(undefined);

        expect(result).toBeUndefined();
      });
    });

    describe('array sanitization', () => {
      it('should sanitize arrays of objects', () => {
        const data = [
          { email: 'user1@test.com', password: 'secret1', firstName: 'John' },
          { email: 'user2@test.com', password: 'secret2', firstName: 'Jane' },
        ];

        const result = sanitizeForLogging(data);

        expect(result).toHaveLength(2);
        expect(result[0].email).toBe('u****@test.com');
        expect(result[0]).not.toHaveProperty('password');
        expect(result[1].email).toBe('u****@test.com');
        expect(result[1]).not.toHaveProperty('password');
      });

      it('should handle empty arrays', () => {
        const result = sanitizeForLogging([]);

        expect(result).toEqual([]);
      });

      it('should handle nested arrays', () => {
        const data = [[{ email: 'test@test.com', password: 'secret', firstName: 'Test' }]];

        const result = sanitizeForLogging(data);

        expect(result[0][0].email).toBe('t***@test.com');
      });
    });

    describe('user object detection', () => {
      it('should detect and sanitize user-like objects with email and password', () => {
        const user = {
          email: 'john@example.com',
          password: 'secret',
          firstName: 'John',
        };

        const result = sanitizeForLogging(user);

        expect(result.email).toBe('j***@example.com');
        expect(result).not.toHaveProperty('password');
      });

      it('should detect and sanitize user-like objects with email and firstName', () => {
        const user = {
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
        };

        const result = sanitizeForLogging(user);

        expect(result.email).toBe('j***@example.com');
        expect(result.firstName).toBe('J***');
        expect(result.lastName).toBe('D**');
      });
    });

    describe('activity object detection', () => {
      it('should detect and sanitize activity-like objects', () => {
        const activity = {
          title: 'Team Meeting',
          description: 'Weekly sync',
          category: 'Work',
        };

        const result = sanitizeForLogging(activity);

        expect(result.title).toBe('Team Meeting');
        expect(result.description).toBe('Weekly sync');
        expect(result.category).toBe('Work');
      });
    });

    describe('event object detection', () => {
      it('should detect and sanitize event-like objects', () => {
        const event = {
          id: 'event-123',
          eventDate: new Date('2024-01-15'),
          title: 'Conference',
        };

        const result = sanitizeForLogging(event);

        expect(result.id).toBe('event-123');
        expect(result.eventDate).toEqual(new Date('2024-01-15'));
      });
    });

    describe('request body detection', () => {
      it('should detect and sanitize request body with email and password', () => {
        // Note: objects with email + password are detected as user-like objects
        // and go through sanitizeUserForLogging which removes password entirely
        const body = {
          email: 'login@test.com',
          password: 'mypassword',
        };

        const result = sanitizeForLogging(body);

        expect(result.email).toBe('l****@test.com');
        // Password is removed (not replaced with [secured]) because it matches user pattern
        expect(result).not.toHaveProperty('password');
      });

      it('should detect and sanitize request body with token', () => {
        const body = {
          token: 'jwt-token-here',
          userId: 'user-123',
        };

        const result = sanitizeForLogging(body);

        expect(result.token).toBe('[secured]');
      });

      it('should detect request body with only password (no email)', () => {
        // This tests the case where email is falsy but password exists
        // The condition (data.email && data.password) is false, but could have token
        const body = {
          password: 'secret',
          username: 'testuser',
        };

        const result = sanitizeForLogging(body);

        // Without email+password combo or token, it falls through to generic sanitization
        expect(result).not.toHaveProperty('password');
      });

      it('should detect request body with email but no password and no token', () => {
        // This tests when email exists but password is falsy and no token
        const body = {
          email: 'test@test.com',
          name: 'Test',
        };

        const result = sanitizeForLogging(body);

        // Without password or token, it falls through to generic sanitization
        // but email isn't masked by removeSensitiveFields
        expect(result.email).toBe('test@test.com');
        expect(result.name).toBe('Test');
      });
    });

    describe('UUID field sanitization', () => {
      it('should mask id field if it is a valid UUID', () => {
        const data = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test',
        };

        const result = sanitizeForLogging(data);

        expect(result.id).toBe('123e****-****-****-****-******174000');
      });

      it('should mask userId field if it is a valid UUID', () => {
        const data = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          action: 'login',
        };

        const result = sanitizeForLogging(data);

        expect(result.userId).toBe('123e****-****-****-****-******174000');
      });

      it('should mask user_id field if it is a valid UUID', () => {
        const data = {
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          action: 'login',
        };

        const result = sanitizeForLogging(data);

        expect(result.user_id).toBe('123e****-****-****-****-******174000');
      });

      it('should not mask non-UUID id fields', () => {
        const data = {
          id: 'simple-id-123',
          name: 'Test',
        };

        const result = sanitizeForLogging(data);

        expect(result.id).toBe('simple-id-123');
      });
    });

    describe('generic object sanitization', () => {
      it('should remove sensitive fields from generic objects', () => {
        const data = {
          id: 'simple-id',
          name: 'Test',
          password: 'should-be-removed',
          apiKey: 'should-be-removed',
        };

        const result = sanitizeForLogging(data);

        expect(result.id).toBe('simple-id');
        expect(result.name).toBe('Test');
        expect(result).not.toHaveProperty('password');
        expect(result).not.toHaveProperty('apiKey');
      });
    });

    describe('primitive values', () => {
      it('should return string values unchanged', () => {
        const result = sanitizeForLogging('test string');

        expect(result).toBe('test string');
      });

      it('should return number values unchanged', () => {
        const result = sanitizeForLogging(42);

        expect(result).toBe(42);
      });

      it('should return boolean values unchanged', () => {
        const result = sanitizeForLogging(true);

        expect(result).toBe(true);
      });
    });
  });

  describe('secureLogger', () => {
    let loggerLogSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;
    let loggerWarnSpy: jest.SpyInstance;
    let loggerDebugSpy: jest.SpyInstance;
    let loggerVerboseSpy: jest.SpyInstance;
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
      loggerVerboseSpy = jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
      process.env.NODE_ENV = originalNodeEnv;
    });

    describe('log method', () => {
      it('should sanitize string messages', () => {
        secureLogger.log('User email: test@example.com');

        expect(loggerLogSpy).toHaveBeenCalledWith('User email: t***@example.com');
      });

      it('should sanitize object messages', () => {
        secureLogger.log({ email: 'test@example.com', password: 'secret', firstName: 'John' });

        expect(loggerLogSpy).toHaveBeenCalled();
        const calledArg = loggerLogSpy.mock.calls[0][0];
        expect(calledArg.email).toBe('t***@example.com');
        expect(calledArg).not.toHaveProperty('password');
      });

      it('should use default context when not provided', () => {
        secureLogger.log('Test message');

        expect(loggerLogSpy).toHaveBeenCalled();
      });

      it('should use custom context when provided', () => {
        secureLogger.log('Test message', 'CustomContext');

        expect(loggerLogSpy).toHaveBeenCalled();
      });
    });

    describe('error method', () => {
      it('should sanitize error messages', () => {
        secureLogger.error('Error for user test@example.com');

        expect(loggerErrorSpy).toHaveBeenCalledWith('Error for user t***@example.com', undefined);
      });

      it('should pass trace parameter', () => {
        secureLogger.error('Error message', 'stack trace here');

        expect(loggerErrorSpy).toHaveBeenCalledWith('Error message', 'stack trace here');
      });

      it('should use custom context when provided', () => {
        secureLogger.error('Error', undefined, 'ErrorContext');

        expect(loggerErrorSpy).toHaveBeenCalled();
      });
    });

    describe('warn method', () => {
      it('should sanitize warning messages', () => {
        secureLogger.warn('Warning: user test@example.com');

        expect(loggerWarnSpy).toHaveBeenCalledWith('Warning: user t***@example.com');
      });

      it('should use custom context when provided', () => {
        secureLogger.warn('Warning', 'WarnContext');

        expect(loggerWarnSpy).toHaveBeenCalled();
      });
    });

    describe('debug method', () => {
      it('should log debug messages in non-production', () => {
        process.env.NODE_ENV = 'development';

        secureLogger.debug('Debug: test@example.com');

        expect(loggerDebugSpy).toHaveBeenCalledWith('Debug: t***@example.com');
      });

      it('should not log debug messages in production', () => {
        process.env.NODE_ENV = 'production';

        secureLogger.debug('Debug message');

        expect(loggerDebugSpy).not.toHaveBeenCalled();
      });

      it('should use custom context when provided', () => {
        process.env.NODE_ENV = 'development';

        secureLogger.debug('Debug', 'DebugContext');

        expect(loggerDebugSpy).toHaveBeenCalled();
      });
    });

    describe('verbose method', () => {
      it('should log verbose messages in non-production', () => {
        process.env.NODE_ENV = 'development';

        secureLogger.verbose('Verbose: test@example.com');

        expect(loggerVerboseSpy).toHaveBeenCalledWith('Verbose: t***@example.com');
      });

      it('should not log verbose messages in production', () => {
        process.env.NODE_ENV = 'production';

        secureLogger.verbose('Verbose message');

        expect(loggerVerboseSpy).not.toHaveBeenCalled();
      });

      it('should use custom context when provided', () => {
        process.env.NODE_ENV = 'development';

        secureLogger.verbose('Verbose', 'VerboseContext');

        expect(loggerVerboseSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Console Sanitization', () => {
    afterEach(() => {
      restoreConsole();
    });

    describe('initializeConsoleSanitization', () => {
      it('should replace console.log with sanitizing function', () => {
        const originalLog = console.log;

        initializeConsoleSanitization();

        expect(console.log).not.toBe(originalLog);
      });

      it('should replace console.info with sanitizing function', () => {
        const originalInfo = console.info;

        initializeConsoleSanitization();

        expect(console.info).not.toBe(originalInfo);
      });

      it('should replace console.warn with sanitizing function', () => {
        const originalWarn = console.warn;

        initializeConsoleSanitization();

        expect(console.warn).not.toBe(originalWarn);
      });

      it('should replace console.error with sanitizing function', () => {
        const originalError = console.error;

        initializeConsoleSanitization();

        expect(console.error).not.toBe(originalError);
      });

      it('should replace console.debug with sanitizing function', () => {
        const originalDebug = console.debug;

        initializeConsoleSanitization();

        expect(console.debug).not.toBe(originalDebug);
      });

      it('should not initialize twice (idempotent)', () => {
        initializeConsoleSanitization();
        const firstLog = console.log;

        initializeConsoleSanitization();
        const secondLog = console.log;

        expect(firstLog).toBe(secondLog);
      });

      it('should call sanitizeForLogging on object arguments for all methods', () => {
        // Test that the functions properly handle object arguments
        initializeConsoleSanitization();

        // Should not throw when called with various argument types
        // This exercises all the sanitized console method code paths
        expect(() => {
          console.log({ test: 'object' });
          console.log('string', 123, null, undefined);
          console.log(null);
          console.info({ info: 'data' });
          console.info('info string');
          console.warn({ warning: 'data' });
          console.warn('warn string');
          console.error({ error: 'data' });
          console.error('error string');
          console.debug({ debug: 'data' });
          console.debug('debug string');
        }).not.toThrow();
      });
    });

    describe('restoreConsole', () => {
      it('should restore original console.log', () => {
        const originalLog = console.log;
        initializeConsoleSanitization();
        const sanitizedLog = console.log;

        restoreConsole();

        expect(console.log).toBe(originalLog);
        expect(console.log).not.toBe(sanitizedLog);
      });

      it('should restore original console.info', () => {
        const originalInfo = console.info;
        initializeConsoleSanitization();

        restoreConsole();

        expect(console.info).toBe(originalInfo);
      });

      it('should restore original console.warn', () => {
        const originalWarn = console.warn;
        initializeConsoleSanitization();

        restoreConsole();

        expect(console.warn).toBe(originalWarn);
      });

      it('should restore original console.error', () => {
        const originalError = console.error;
        initializeConsoleSanitization();

        restoreConsole();

        expect(console.error).toBe(originalError);
      });

      it('should restore original console.debug', () => {
        const originalDebug = console.debug;
        initializeConsoleSanitization();

        restoreConsole();

        expect(console.debug).toBe(originalDebug);
      });

      it('should do nothing if not initialized', () => {
        const originalLog = console.log;

        // Call restore without initialize - should not throw and should not change anything
        expect(() => restoreConsole()).not.toThrow();
        expect(console.log).toBe(originalLog);
      });

      it('should allow re-initialization after restore', () => {
        const originalLog = console.log;

        initializeConsoleSanitization();
        const firstSanitized = console.log;

        restoreConsole();
        expect(console.log).toBe(originalLog);

        initializeConsoleSanitization();
        const secondSanitized = console.log;

        // After re-init, should have new sanitized function
        expect(console.log).not.toBe(originalLog);
        expect(secondSanitized).not.toBe(firstSanitized);
      });
    });
  });
});
