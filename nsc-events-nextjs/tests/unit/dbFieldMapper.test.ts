import {
  normalizeActivityId,
  normalizeActivityIds,
  getActivityId,
} from '../../utility/dbFieldMapper';

// Helper type for test objects with optional id fields
type TestActivity = Record<string, unknown>;

describe('dbFieldMapper', () => {
  describe('normalizeActivityId', () => {
    describe('null and undefined handling', () => {
      it('should return null when input is null', () => {
        const result = normalizeActivityId(null);
        expect(result).toBeNull();
      });

      it('should return null when input is explicitly null', () => {
        const result = normalizeActivityId<TestActivity>(null);
        expect(result).toBeNull();
      });
    });

    describe('id to _id normalization (PostgreSQL to MongoDB)', () => {
      it('should add _id when only id exists', () => {
        const input: TestActivity = { id: 'test-123', name: 'Test Activity' };
        const result = normalizeActivityId(input);

        expect(result).toEqual({
          id: 'test-123',
          _id: 'test-123',
          name: 'Test Activity',
        });
      });

      it('should add _id with numeric id', () => {
        const input: TestActivity = { id: 456, name: 'Test Activity' };
        const result = normalizeActivityId(input);

        expect(result).toEqual({
          id: 456,
          _id: 456,
          name: 'Test Activity',
        });
      });

      it('should handle UUID-style id', () => {
        const input: TestActivity = { id: '550e8400-e29b-41d4-a716-446655440000' };
        const result = normalizeActivityId(input);

        expect(result?._id).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(result?.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      });
    });

    describe('_id to id normalization (MongoDB to PostgreSQL)', () => {
      it('should add id when only _id exists', () => {
        const input: TestActivity = { _id: 'mongo-456', name: 'Test Activity' };
        const result = normalizeActivityId(input);

        expect(result).toEqual({
          id: 'mongo-456',
          _id: 'mongo-456',
          name: 'Test Activity',
        });
      });

      it('should add id with ObjectId-style _id', () => {
        const input: TestActivity = { _id: '507f1f77bcf86cd799439011', eventTitle: 'Event' };
        const result = normalizeActivityId(input);

        expect(result?.id).toBe('507f1f77bcf86cd799439011');
        expect(result?._id).toBe('507f1f77bcf86cd799439011');
      });
    });

    describe('when both id and _id exist', () => {
      it('should preserve both values unchanged', () => {
        const input: TestActivity = { id: 'pg-123', _id: 'mongo-456', name: 'Test' };
        const result = normalizeActivityId(input);

        expect(result).toEqual({
          id: 'pg-123',
          _id: 'mongo-456',
          name: 'Test',
        });
      });

      it('should not overwrite existing _id when id exists', () => {
        const input: TestActivity = { id: 'id-value', _id: 'original-_id' };
        const result = normalizeActivityId(input);

        expect(result?._id).toBe('original-_id');
        expect(result?.id).toBe('id-value');
      });
    });

    describe('data structure preservation', () => {
      it('should preserve all original fields', () => {
        const input: TestActivity = {
          id: 'test-123',
          eventTitle: 'Test Event',
          eventDescription: 'A test description',
          eventCategory: 'Workshop',
          startDate: '2024-01-15',
          endDate: '2024-01-16',
          eventCapacity: 50,
          eventTags: ['tech', 'coding'],
          eventSocialMedia: {
            facebook: 'https://facebook.com/event',
            twitter: 'https://twitter.com/event',
            instagram: '',
            hashtag: '#testevent',
          },
        };

        const result = normalizeActivityId(input);

        expect(result).toMatchObject({
          eventTitle: 'Test Event',
          eventDescription: 'A test description',
          eventCategory: 'Workshop',
          startDate: '2024-01-15',
          endDate: '2024-01-16',
          eventCapacity: 50,
          eventTags: ['tech', 'coding'],
          eventSocialMedia: {
            facebook: 'https://facebook.com/event',
            twitter: 'https://twitter.com/event',
            instagram: '',
            hashtag: '#testevent',
          },
        });
      });

      it('should preserve nested objects', () => {
        const input: TestActivity = {
          id: '123',
          nested: { deep: { value: 'preserved' } },
        };
        const result = normalizeActivityId(input);
        const nested = result?.nested as { deep: { value: string } };

        expect(nested?.deep?.value).toBe('preserved');
      });

      it('should preserve arrays', () => {
        const input: TestActivity = {
          id: '123',
          items: [1, 2, 3],
          speakers: ['Alice', 'Bob'],
        };
        const result = normalizeActivityId(input);

        expect(result?.items).toEqual([1, 2, 3]);
        expect(result?.speakers).toEqual(['Alice', 'Bob']);
      });

      it('should not mutate the original object', () => {
        const input: TestActivity = { id: 'test-123', name: 'Test' };
        const originalCopy = { ...input };
        normalizeActivityId(input);

        expect(input).toEqual(originalCopy);
        expect(input).not.toHaveProperty('_id');
      });
    });

    describe('edge cases with falsy id values', () => {
      it('should handle empty string id', () => {
        const input: TestActivity = { id: '', name: 'Test' };
        const result = normalizeActivityId(input);

        // Empty string is not undefined, so _id should be added
        expect(result?.id).toBe('');
        expect(result?._id).toBe('');
      });

      it('should handle zero as id', () => {
        const input: TestActivity = { id: 0, name: 'Test' };
        const result = normalizeActivityId(input);

        // 0 is not undefined, so _id should be added
        expect(result?.id).toBe(0);
        expect(result?._id).toBe(0);
      });

      it('should handle false as id', () => {
        const input: TestActivity = { id: false, name: 'Test' };
        const result = normalizeActivityId(input);

        // false is not undefined, so _id should be added
        expect(result?.id).toBe(false);
        expect(result?._id).toBe(false);
      });

      it('should handle undefined id value - should not add _id', () => {
        const input: TestActivity = { id: undefined, name: 'Test' };
        const result = normalizeActivityId(input);

        // When id is explicitly undefined, _id should NOT be added
        expect(result?._id).toBeUndefined();
      });

      it('should handle null id value - should not add _id', () => {
        const input: TestActivity = { id: null, name: 'Test' };
        const result = normalizeActivityId(input);

        // When id is explicitly null, the condition `id !== undefined` is true
        // but this is questionable behavior - null might not be a valid ID
        expect(result?.id).toBeNull();
        expect(result?._id).toBeNull();
      });
    });

    describe('when neither id nor _id exist', () => {
      it('should return object unchanged', () => {
        const input: TestActivity = { name: 'Test', value: 42 };
        const result = normalizeActivityId(input);

        expect(result).toEqual({ name: 'Test', value: 42 });
        expect(result).not.toHaveProperty('id');
        expect(result).not.toHaveProperty('_id');
      });
    });

    describe('ActivityDatabase model compatibility', () => {
      it('should normalize ActivityDatabase-like object with id only', () => {
        const activityDb: TestActivity = {
          id: 'db-123',
          createdByUserId: 'user-456',
          eventTitle: 'Database Event',
          eventDescription: 'Description',
          eventCategory: 'Tech',
          startDate: '2024-01-01',
          endDate: '2024-01-02',
          eventLocation: 'Online',
          eventCoverPhoto: '',
          eventDocument: '',
          eventHost: 'Host',
          eventRegistration: 'Open',
          eventCapacity: 100,
          eventTags: ['tag1'],
          eventSchedule: '',
          eventSpeakers: ['Speaker'],
          eventPrerequisites: '',
          eventCancellationPolicy: '',
          eventContact: 'contact@test.com',
          eventSocialMedia: {
            facebook: '',
            twitter: '',
            instagram: '',
            hashtag: '',
          },
          attendanceCount: 0,
          eventPrivacy: 'public',
          eventAccessibility: '',
          eventMeetingURL: '',
          eventNote: '',
        };

        const result = normalizeActivityId(activityDb);

        expect(result?.id).toBe('db-123');
        expect(result?._id).toBe('db-123');
        expect(result?.eventTitle).toBe('Database Event');
      });
    });
  });

  describe('normalizeActivityIds', () => {
    describe('null and empty array handling', () => {
      it('should return empty array when input is null', () => {
        const result = normalizeActivityIds(null);
        expect(result).toEqual([]);
      });

      it('should return empty array when input is empty array', () => {
        const result = normalizeActivityIds([]);
        expect(result).toEqual([]);
      });
    });

    describe('array normalization', () => {
      it('should normalize all items in array', () => {
        const input: TestActivity[] = [
          { id: '1', name: 'First' },
          { id: '2', name: 'Second' },
          { id: '3', name: 'Third' },
        ];
        const result = normalizeActivityIds(input);

        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({ id: '1', _id: '1', name: 'First' });
        expect(result[1]).toEqual({ id: '2', _id: '2', name: 'Second' });
        expect(result[2]).toEqual({ id: '3', _id: '3', name: 'Third' });
      });

      it('should handle mixed id sources in array', () => {
        const input: TestActivity[] = [
          { id: 'pg-1', name: 'PostgreSQL item' },
          { _id: 'mongo-1', name: 'MongoDB item' },
          { id: 'both-id', _id: 'both-_id', name: 'Both' },
        ];
        const result = normalizeActivityIds(input);

        expect(result[0]?.id).toBe('pg-1');
        expect(result[0]?._id).toBe('pg-1');
        expect(result[1]?.id).toBe('mongo-1');
        expect(result[1]?._id).toBe('mongo-1');
        expect(result[2]?.id).toBe('both-id');
        expect(result[2]?._id).toBe('both-_id');
      });

      it('should preserve array order', () => {
        const input: TestActivity[] = [
          { id: 'third', order: 3 },
          { id: 'first', order: 1 },
          { id: 'second', order: 2 },
        ];
        const result = normalizeActivityIds(input);

        expect(result[0]?.order).toBe(3);
        expect(result[1]?.order).toBe(1);
        expect(result[2]?.order).toBe(2);
      });
    });

    describe('data structure preservation in arrays', () => {
      it('should preserve complex objects in array', () => {
        const input: TestActivity[] = [
          {
            id: '1',
            eventSocialMedia: { facebook: 'fb', twitter: 'tw', instagram: '', hashtag: '#test' },
            eventTags: ['a', 'b'],
          },
        ];
        const result = normalizeActivityIds(input);

        expect(result[0]?.eventSocialMedia).toEqual({
          facebook: 'fb',
          twitter: 'tw',
          instagram: '',
          hashtag: '#test',
        });
        expect(result[0]?.eventTags).toEqual(['a', 'b']);
      });

      it('should not mutate original array', () => {
        const input: TestActivity[] = [{ id: '1', name: 'Test' }];
        const originalLength = input.length;
        const originalItem = { ...input[0] };

        normalizeActivityIds(input);

        expect(input).toHaveLength(originalLength);
        expect(input[0]).toEqual(originalItem);
      });
    });

    describe('large array handling', () => {
      it('should handle large arrays efficiently', () => {
        const input: TestActivity[] = Array.from({ length: 1000 }, (_, i) => ({
          id: `id-${i}`,
          name: `Item ${i}`,
        }));

        const result = normalizeActivityIds(input);

        expect(result).toHaveLength(1000);
        expect(result[0]?._id).toBe('id-0');
        expect(result[999]?._id).toBe('id-999');
      });
    });
  });

  describe('getActivityId', () => {
    describe('null and undefined handling', () => {
      it('should return undefined when input is null', () => {
        const result = getActivityId(null);
        expect(result).toBeUndefined();
      });

      it('should return undefined when input is undefined', () => {
        const result = getActivityId(undefined);
        expect(result).toBeUndefined();
      });
    });

    describe('id extraction', () => {
      it('should return id when only id exists', () => {
        const result = getActivityId({ id: 'test-123' });
        expect(result).toBe('test-123');
      });

      it('should return _id when only _id exists', () => {
        const result = getActivityId({ _id: 'mongo-456' });
        expect(result).toBe('mongo-456');
      });

      it('should return id when both id and _id exist (id takes priority)', () => {
        const result = getActivityId({ id: 'pg-id', _id: 'mongo-id' });
        expect(result).toBe('pg-id');
      });
    });

    describe('falsy id value handling', () => {
      /**
       * These tests catch a bug in getActivityId: the function uses || operator
       * which treats falsy values (empty string, 0) as "not found" and incorrectly
       * falls back to _id. The fix is to use ?? (nullish coalescing) instead.
       */
      it('should return empty string id, not fall back to _id', () => {
        const activity = { id: '', _id: 'fallback' };
        const result = getActivityId(activity);

        // Empty string is a valid id value - should not fall back to _id
        expect(result).toBe('');
      });

      it('should return numeric 0 id, not fall back to _id', () => {
        const activity = { id: 0, _id: 'fallback' };
        const result = getActivityId(activity);

        // Numeric 0 is a valid id value - should not fall back to _id
        expect(result).toBe(0);
      });

      it('should return _id when id is explicitly undefined', () => {
        const activity = { id: undefined, _id: 'correct-fallback' };
        const result = getActivityId(activity);

        // This is correct behavior - undefined should fall back to _id
        expect(result).toBe('correct-fallback');
      });

      it('should return undefined when neither id nor _id exist', () => {
        const result = getActivityId({ name: 'No ID object' });
        expect(result).toBeUndefined();
      });

      it('should return undefined when both id and _id are undefined', () => {
        const result = getActivityId({ id: undefined, _id: undefined });
        expect(result).toBeUndefined();
      });
    });

    describe('type coercion and return types', () => {
      it('should handle numeric id', () => {
        const result = getActivityId({ id: 123 });
        expect(result).toBe(123);
      });

      it('should handle string _id', () => {
        const result = getActivityId({ _id: 'string-id' });
        expect(result).toBe('string-id');
      });

      it('should handle ObjectId-like string', () => {
        const result = getActivityId({ _id: '507f1f77bcf86cd799439011' });
        expect(result).toBe('507f1f77bcf86cd799439011');
      });
    });

    describe('with complex objects', () => {
      it('should extract id from ActivityDatabase-like object', () => {
        const activity = {
          id: 'db-id-123',
          _id: 'mongo-id-456',
          eventTitle: 'Test Event',
          eventDescription: 'Description',
        };
        const result = getActivityId(activity);

        expect(result).toBe('db-id-123');
      });

      it('should work with minimal object', () => {
        const result = getActivityId({ id: 'minimal' });
        expect(result).toBe('minimal');
      });
    });
  });

  describe('integration scenarios', () => {
    describe('PostgreSQL to MongoDB workflow', () => {
      it('should normalize PostgreSQL data for MongoDB compatibility', () => {
        const pgActivities: TestActivity[] = [
          { id: 'pg-1', eventTitle: 'Event 1' },
          { id: 'pg-2', eventTitle: 'Event 2' },
        ];

        const normalized = normalizeActivityIds(pgActivities);

        // All activities should now have both id and _id
        normalized.forEach((activity) => {
          expect(activity.id).toBeDefined();
          expect(activity._id).toBeDefined();
          expect(activity._id).toBe(activity.id);
        });
      });
    });

    describe('MongoDB to PostgreSQL workflow', () => {
      it('should normalize MongoDB data for PostgreSQL compatibility', () => {
        const mongoActivities: TestActivity[] = [
          { _id: '507f1f77bcf86cd799439011', eventTitle: 'Event 1' },
          { _id: '507f1f77bcf86cd799439012', eventTitle: 'Event 2' },
        ];

        const normalized = normalizeActivityIds(mongoActivities);

        // All activities should now have both id and _id
        normalized.forEach((activity) => {
          expect(activity.id).toBeDefined();
          expect(activity._id).toBeDefined();
          expect(activity.id).toBe(activity._id);
        });
      });
    });

    describe('round-trip data integrity', () => {
      it('should maintain data integrity through multiple normalizations', () => {
        const original: TestActivity = { id: 'test-id', eventTitle: 'Test', eventTags: ['a', 'b'] };

        const firstNormalization = normalizeActivityId(original);
        const secondNormalization = normalizeActivityId(firstNormalization);

        expect(secondNormalization).toEqual(firstNormalization);
        expect(secondNormalization?.eventTitle).toBe('Test');
        expect(secondNormalization?.eventTags).toEqual(['a', 'b']);
      });
    });

    describe('getActivityId with normalized data', () => {
      it('should consistently return id from normalized data', () => {
        const activities: TestActivity[] = [
          { id: 'id-1' },
          { _id: 'id-2' },
          { id: 'id-3', _id: 'different-id' },
        ];

        const normalized = normalizeActivityIds(activities);

        expect(getActivityId(normalized[0])).toBe('id-1');
        expect(getActivityId(normalized[1])).toBe('id-2');
        // For the third item, id takes priority
        expect(getActivityId(normalized[2])).toBe('id-3');
      });
    });
  });
});
