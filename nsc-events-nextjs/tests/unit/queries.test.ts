/**
 * Unit tests for queries.ts utility
 *
 * This file provides comprehensive test coverage for React Query custom hooks
 * that handle event-related API calls. Tests cover:
 * - useFilteredEvents: Paginated event fetching with tag filtering
 * - useMyEvents: User-specific event fetching
 * - useEventById: Single event fetching by ID
 * - useArchivedEvents: Archived event fetching
 * - useIsAttending: Event registration status checking
 *
 * BUG DOCUMENTED: The useMyEvents hook has a caching bug where userId is not
 * included in the query key, causing stale data when switching users.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { ActivityDatabase } from '@/models/activityDatabase';

// Mock the module with environment variable before importing
jest.mock('@/utility/queries', () => {
  // Dynamically import the actual module implementation
  const originalModule = jest.requireActual('@/utility/queries');
  return originalModule;
});

// Set environment variable before any imports
const mockApiUrl = 'http://test-api.example.com';
process.env.NSC_EVENTS_PUBLIC_API_URL = mockApiUrl;

// Import hooks after environment is set up
import {
  useFilteredEvents,
  useMyEvents,
  useEventById,
  useArchivedEvents,
  useIsAttending,
} from '@/utility/queries';

describe('queries utility', () => {
  let queryClient: QueryClient;
  let mockLocalStorage: { [key: string]: string };
  let consoleErrorSpy: jest.SpyInstance;

  // Create a wrapper component for React Query
  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children
      );
  };

  // Sample event data for mocking
  const createMockEvent = (overrides: Partial<ActivityDatabase> = {}): ActivityDatabase => ({
    id: 'event-123',
    _id: 'event-123',
    createdByUserId: 'user-456',
    eventTitle: 'Test Event',
    eventDescription: 'Test Description',
    eventCategory: 'Workshop',
    eventLocation: 'Test Location',
    eventCoverPhoto: 'photo.jpg',
    eventDocument: 'doc.pdf',
    eventHost: 'Test Host',
    eventRegistration: 'open',
    eventCapacity: 100,
    eventTags: ['Technology'],
    eventSchedule: 'Schedule details',
    eventSpeakers: ['Speaker 1'],
    eventPrerequisites: 'None',
    eventCancellationPolicy: 'Full refund',
    eventContact: 'test@example.com',
    eventSocialMedia: {
      facebook: 'https://facebook.com',
      twitter: 'https://twitter.com',
      instagram: 'https://instagram.com',
      hashtag: '#testevent',
    },
    attendanceCount: 50,
    eventPrivacy: 'public',
    eventAccessibility: 'Accessible',
    eventMeetingURL: 'https://meet.example.com',
    eventNote: 'Test note',
    startDate: '2024-12-01T10:00:00Z',
    endDate: '2024-12-01T18:00:00Z',
    isHidden: false,
    isArchived: false,
    ...overrides,
  });

  beforeEach(() => {
    // Suppress console.error for expected error handling in tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for testing
          gcTime: 0, // Disable garbage collection
          staleTime: 0, // Consider data immediately stale for testing
        },
      },
    });

    // Mock localStorage
    mockLocalStorage = {};
    global.Storage.prototype.getItem = jest.fn((key: string) => mockLocalStorage[key] || null);
    global.Storage.prototype.setItem = jest.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    global.Storage.prototype.removeItem = jest.fn((key: string) => {
      delete mockLocalStorage[key];
    });

    // Reset fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('useFilteredEvents', () => {
    describe('Query Configuration', () => {
      it('should generate correct query key with page and tags', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true, ['Technology', 'Workshop']),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Verify the query key structure
        const queryState = queryClient.getQueryState(['events', 1, ['Technology', 'Workshop']]);
        expect(queryState).toBeDefined();
      });

      it('should generate correct query key with default empty tags array', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Verify the query key structure with empty tags
        const queryState = queryClient.getQueryState(['events', 1, []]);
        expect(queryState).toBeDefined();
      });

      it('should not execute query when isEnabled is false', async () => {
        const { result } = renderHook(
          () => useFilteredEvents(1, false, ['Technology']),
          { wrapper: createWrapper() }
        );

        // Query should not run
        expect(result.current.isFetching).toBe(false);
        expect(result.current.data).toBeUndefined();
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should execute query when isEnabled is true', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true, ['Technology']),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('API URL Construction', () => {
      it('should construct correct URL with page and tags parameters', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents(2, true, ['Technology', 'Workshop']),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('/events');
        expect(fetchCall).toContain('page=2');
        expect(fetchCall).toContain('isArchived=false');
        expect(fetchCall).toContain('tags=Technology%2CWorkshop');
        expect(fetchCall).toContain('numEvents=6');
      });

      it('should handle empty tags array in URL', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true, []),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('tags=');
      });

      it('should handle page as string type (any)', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents('5' as any, true, []),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('page=5');
      });
    });

    describe('Data Transformation', () => {
      it('should normalize event IDs from response', async () => {
        // Event with only id field (PostgreSQL style)
        const mockEventWithIdOnly = {
          ...createMockEvent(),
          _id: undefined,
        };
        delete (mockEventWithIdOnly as any)._id;

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve([mockEventWithIdOnly]),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // normalizeActivityIds should add _id field
        expect(result.current.data?.[0]?.id).toBe('event-123');
        expect(result.current.data?.[0]?._id).toBe('event-123');
      });

      it('should normalize event IDs when _id present but id missing (MongoDB style)', async () => {
        const mockEventWithUnderscoreIdOnly = {
          ...createMockEvent(),
          _id: 'mongo-id-123',
          id: undefined,
        };
        delete (mockEventWithUnderscoreIdOnly as any).id;

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve([mockEventWithUnderscoreIdOnly]),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // normalizeActivityIds should add id field from _id
        expect(result.current.data?.[0]?._id).toBe('mongo-id-123');
        expect(result.current.data?.[0]?.id).toBe('mongo-id-123');
      });

      it('should return empty array when API returns null', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(null),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
      });

      it('should return multiple events correctly', async () => {
        const mockEvents = [
          createMockEvent({ id: 'event-1', eventTitle: 'Event 1' }),
          createMockEvent({ id: 'event-2', eventTitle: 'Event 2' }),
          createMockEvent({ id: 'event-3', eventTitle: 'Event 3' }),
        ];

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(3);
        expect(result.current.data?.[0]?.eventTitle).toBe('Event 1');
        expect(result.current.data?.[2]?.eventTitle).toBe('Event 3');
      });
    });

    describe('Error Handling', () => {
      it('should handle fetch failure', async () => {
        const networkError = new Error('Network error');
        (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

        const { result } = renderHook(
          () => useFilteredEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
      });

      it('should handle JSON parse failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.reject(new Error('Invalid JSON')),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
      });
    });

    describe('Query States', () => {
      it('should have loading state initially', async () => {
        (global.fetch as jest.Mock).mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({
            json: () => Promise.resolve([]),
          }), 100))
        );

        const { result } = renderHook(
          () => useFilteredEvents(1, true),
          { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.isPending).toBe(true);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
      });

      it('should transition to success state', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
          expect(result.current.isSuccess).toBe(true);
        });
      });
    });
  });

  describe('useArchivedEvents', () => {
    describe('Query Configuration', () => {
      it('should generate correct query key with page', async () => {
        const mockEvents = [createMockEvent({ isArchived: true })];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useArchivedEvents(3, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Verify the query key structure
        const queryState = queryClient.getQueryState(['archivedEvents', 3]);
        expect(queryState).toBeDefined();
      });

      it('should not execute query when isEnabled is false', async () => {
        const { result } = renderHook(
          () => useArchivedEvents(1, false),
          { wrapper: createWrapper() }
        );

        expect(result.current.isFetching).toBe(false);
        expect(result.current.data).toBeUndefined();
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    describe('API URL Construction', () => {
      it('should construct correct URL with isArchived=true', async () => {
        const mockEvents = [createMockEvent({ isArchived: true })];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useArchivedEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('/events');
        expect(fetchCall).toContain('page=1');
        expect(fetchCall).toContain('isArchived=true');
        expect(fetchCall).toContain('numEvents=6');
      });
    });

    describe('Data Transformation', () => {
      it('should normalize archived event IDs', async () => {
        const mockEventWithIdOnly = {
          ...createMockEvent({ isArchived: true }),
          _id: undefined,
        };
        delete (mockEventWithIdOnly as any)._id;

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve([mockEventWithIdOnly]),
        });

        const { result } = renderHook(
          () => useArchivedEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.[0]?.id).toBe('event-123');
        expect(result.current.data?.[0]?._id).toBe('event-123');
      });

      it('should return empty array when API returns null', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(null),
        });

        const { result } = renderHook(
          () => useArchivedEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
      });
    });

    describe('Error Handling', () => {
      it('should handle fetch failure for archived events', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Server error'));

        const { result } = renderHook(
          () => useArchivedEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('useMyEvents', () => {
    describe('Query Configuration', () => {
      it('should generate query key with userId and page', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useMyEvents('user-123', 2, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Verify the query key includes userId to prevent stale data when switching users
        const queryState = queryClient.getQueryState(['myEvents', 'user-123', 2]);
        expect(queryState).toBeDefined();
      });

      it('should not execute query when isEnabled is false', async () => {
        const { result } = renderHook(
          () => useMyEvents('user-123', 1, false),
          { wrapper: createWrapper() }
        );

        expect(result.current.isFetching).toBe(false);
        expect(result.current.data).toBeUndefined();
        expect(global.fetch).not.toHaveBeenCalled();
      });

      /**
       * Test that userId is included in query key to prevent stale data
       *
       * This test verifies that different users on the same page get their
       * own cached data because userId is included in the query key.
       */
      it('should fetch separate data for different users on same page', async () => {
        // First user's events
        const user1Events = [createMockEvent({ id: 'user1-event', eventTitle: 'User 1 Event' })];
        // Second user's events
        const user2Events = [createMockEvent({ id: 'user2-event', eventTitle: 'User 2 Event' })];

        // First render for user-1
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(user1Events),
        });

        const { result: result1 } = renderHook(
          () => useMyEvents('user-1', 1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result1.current.isSuccess).toBe(true));
        expect(result1.current.data?.[0]?.eventTitle).toBe('User 1 Event');

        // Now render for user-2 on the same page
        // With userId in query key, this should fetch separately
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(user2Events),
        });

        const { result: result2 } = renderHook(
          () => useMyEvents('user-2', 1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result2.current.isSuccess).toBe(true));

        // User-2 should get their own events, not user-1's cached data
        expect(result2.current.data?.[0]?.eventTitle).toBe('User 2 Event');

        // Two fetches should have been made (one per user)
        expect(global.fetch).toHaveBeenCalledTimes(2);

        // Verify separate cache entries
        expect(queryClient.getQueryState(['myEvents', 'user-1', 1])).toBeDefined();
        expect(queryClient.getQueryState(['myEvents', 'user-2', 1])).toBeDefined();
      });
    });

    describe('API URL Construction', () => {
      it('should construct correct URL with userId', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useMyEvents('user-abc-123', 1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('/events/user/user-abc-123');
        expect(fetchCall).toContain('page=1');
        expect(fetchCall).toContain('numEvents=6');
      });

      it('should handle special characters in userId', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useMyEvents('user@example.com', 1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('user@example.com');
      });
    });

    describe('Data Transformation', () => {
      it('should normalize my event IDs', async () => {
        const mockEventWithIdOnly = {
          ...createMockEvent(),
          _id: undefined,
        };
        delete (mockEventWithIdOnly as any)._id;

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve([mockEventWithIdOnly]),
        });

        const { result } = renderHook(
          () => useMyEvents('user-123', 1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.[0]?.id).toBe('event-123');
        expect(result.current.data?.[0]?._id).toBe('event-123');
      });

      it('should return empty array when API returns null', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(null),
        });

        const { result } = renderHook(
          () => useMyEvents('user-123', 1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
      });
    });

    describe('Error Handling', () => {
      it('should handle fetch failure for my events', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

        const { result } = renderHook(
          () => useMyEvents('user-123', 1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('useEventById', () => {
    describe('Query Configuration', () => {
      it('should generate correct query key with eventId', async () => {
        const mockEvent = createMockEvent({ id: 'specific-event-id' });
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvent),
        });

        const { result } = renderHook(
          () => useEventById('specific-event-id'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Verify the query key structure
        const queryState = queryClient.getQueryState(['specific-event-id']);
        expect(queryState).toBeDefined();
      });

      it('should allow null eventId in query', async () => {
        // The hook accepts null but will still make the fetch call
        // This is a potential issue as it will create URL /events/find/null
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(null),
        });

        const { result } = renderHook(
          () => useEventById(null),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // This demonstrates that the hook doesn't have an enabled condition for null
        // It will fetch /events/find/null which is likely not intended
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('/events/find/null');
      });
    });

    describe('API URL Construction', () => {
      it('should construct correct URL with event ID', async () => {
        const mockEvent = createMockEvent({ id: 'event-xyz' });
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvent),
        });

        const { result } = renderHook(
          () => useEventById('event-xyz'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('/events/find/event-xyz');
      });
    });

    describe('Data Transformation', () => {
      it('should normalize single event ID from PostgreSQL format', async () => {
        const mockEventWithIdOnly = {
          ...createMockEvent({ id: 'pg-event-id' }),
          _id: undefined,
        };
        delete (mockEventWithIdOnly as any)._id;

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEventWithIdOnly),
        });

        const { result } = renderHook(
          () => useEventById('pg-event-id'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.id).toBe('pg-event-id');
        expect(result.current.data?._id).toBe('pg-event-id');
      });

      it('should normalize single event ID from MongoDB format', async () => {
        const mockEventWithUnderscoreIdOnly = {
          ...createMockEvent(),
          _id: 'mongo-event-id',
          id: undefined,
        };
        delete (mockEventWithUnderscoreIdOnly as any).id;

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEventWithUnderscoreIdOnly),
        });

        const { result } = renderHook(
          () => useEventById('mongo-event-id'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?._id).toBe('mongo-event-id');
        expect(result.current.data?.id).toBe('mongo-event-id');
      });

      it('should return null when API returns null', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(null),
        });

        const { result } = renderHook(
          () => useEventById('non-existent-id'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
      });

      it('should preserve all event fields', async () => {
        const mockEvent = createMockEvent({
          id: 'full-event',
          eventTitle: 'Full Event Test',
          eventDescription: 'Complete description',
          eventCapacity: 200,
          eventTags: ['Tech', 'Workshop'],
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvent),
        });

        const { result } = renderHook(
          () => useEventById('full-event'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.eventTitle).toBe('Full Event Test');
        expect(result.current.data?.eventDescription).toBe('Complete description');
        expect(result.current.data?.eventCapacity).toBe(200);
        expect(result.current.data?.eventTags).toEqual(['Tech', 'Workshop']);
      });
    });

    describe('Error Handling', () => {
      it('should handle fetch failure for event by ID', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Event not found'));

        const { result } = renderHook(
          () => useEventById('invalid-id'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBeDefined();
      });

      it('should handle 404 response gracefully', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.reject(new Error('Not found')),
        });

        const { result } = renderHook(
          () => useEventById('missing-event'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
      });
    });
  });

  describe('useIsAttending', () => {
    describe('Query Configuration', () => {
      it('should generate correct query key with eventId and userId', async () => {
        mockLocalStorage['token'] = 'valid-token';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isRegistered: true }),
        });

        const { result } = renderHook(
          () => useIsAttending('event-123', 'user-456'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Verify the query key structure
        const queryState = queryClient.getQueryState(['isAttending', 'event-123', 'user-456']);
        expect(queryState).toBeDefined();
      });
    });

    describe('Validation and Error Handling', () => {
      it('should throw error when eventId is undefined', async () => {
        mockLocalStorage['token'] = 'valid-token';

        const { result } = renderHook(
          () => useIsAttending(undefined, 'user-456'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe('Missing eventId or userId');
      });

      it('should throw error when userId is undefined', async () => {
        mockLocalStorage['token'] = 'valid-token';

        const { result } = renderHook(
          () => useIsAttending('event-123', undefined),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe('Missing eventId or userId');
      });

      it('should throw error when both eventId and userId are undefined', async () => {
        mockLocalStorage['token'] = 'valid-token';

        const { result } = renderHook(
          () => useIsAttending(undefined, undefined),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe('Missing eventId or userId');
      });

      it('should handle network error', async () => {
        mockLocalStorage['token'] = 'valid-token';
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

        const { result } = renderHook(
          () => useIsAttending('event-123', 'user-456'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
      });

      it('should throw error when response is not ok', async () => {
        mockLocalStorage['token'] = 'valid-token';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        });

        const { result } = renderHook(
          () => useIsAttending('event-123', 'user-456'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe('Network response was not ok');
      });

      it('should handle 500 server error', async () => {
        mockLocalStorage['token'] = 'valid-token';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        });

        const { result } = renderHook(
          () => useIsAttending('event-123', 'user-456'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error?.message).toBe('Network response was not ok');
      });
    });

    describe('API URL Construction and Authentication', () => {
      it('should construct correct URL with eventId and userId', async () => {
        mockLocalStorage['token'] = 'test-bearer-token';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isRegistered: true }),
        });

        const { result } = renderHook(
          () => useIsAttending('event-abc', 'user-xyz'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const [fetchUrl, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
        expect(fetchUrl).toContain('/event-registration/check/event-abc/user-xyz');
        expect(fetchOptions.headers.Authorization).toBe('Bearer test-bearer-token');
      });

      it('should include Authorization header from localStorage token', async () => {
        mockLocalStorage['token'] = 'my-secret-token';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isRegistered: false }),
        });

        const { result } = renderHook(
          () => useIsAttending('event-123', 'user-456'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1];
        expect(fetchOptions.headers.Authorization).toBe('Bearer my-secret-token');
      });

      it('should handle missing token in localStorage', async () => {
        // No token set in localStorage
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isRegistered: false }),
        });

        const { result } = renderHook(
          () => useIsAttending('event-123', 'user-456'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // Should still make request but with null token
        const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1];
        expect(fetchOptions.headers.Authorization).toBe('Bearer null');
      });
    });

    describe('Data Transformation', () => {
      it('should return true when user is registered', async () => {
        mockLocalStorage['token'] = 'valid-token';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isRegistered: true }),
        });

        const { result } = renderHook(
          () => useIsAttending('event-123', 'user-456'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe(true);
      });

      it('should return false when user is not registered', async () => {
        mockLocalStorage['token'] = 'valid-token';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ isRegistered: false }),
        });

        const { result } = renderHook(
          () => useIsAttending('event-123', 'user-456'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe(false);
      });

      it('should extract isRegistered field from response object', async () => {
        mockLocalStorage['token'] = 'valid-token';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            isRegistered: true,
            extraField: 'ignored',
            anotherField: 123,
          }),
        });

        const { result } = renderHook(
          () => useIsAttending('event-123', 'user-456'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe(true);
      });

      it('should handle response with missing isRegistered field gracefully', async () => {
        mockLocalStorage['token'] = 'valid-token';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

        const { result } = renderHook(
          () => useIsAttending('event-123', 'user-456'),
          { wrapper: createWrapper() }
        );

        // When the API response doesn't have isRegistered field,
        // the hook extracts data.isRegistered which will be undefined
        await waitFor(() => expect(result.current.isFetching).toBe(false));
        expect(result.current.data).toBeUndefined();
      });
    });

    describe('Query States', () => {
      it('should have loading state during fetch', async () => {
        mockLocalStorage['token'] = 'valid-token';
        (global.fetch as jest.Mock).mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ isRegistered: true }),
          }), 100))
        );

        const { result } = renderHook(
          () => useIsAttending('event-123', 'user-456'),
          { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Query Key Uniqueness', () => {
    it('should have unique keys for different hooks', async () => {
      // Set up mock responses for all hooks
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: () => Promise.resolve([createMockEvent()]) })
        .mockResolvedValueOnce({ json: () => Promise.resolve([createMockEvent({ isArchived: true })]) })
        .mockResolvedValueOnce({ json: () => Promise.resolve([createMockEvent()]) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(createMockEvent()) });

      // Render all hooks
      const { result: filteredResult } = renderHook(
        () => useFilteredEvents(1, true, ['Tech']),
        { wrapper: createWrapper() }
      );
      const { result: archivedResult } = renderHook(
        () => useArchivedEvents(1, true),
        { wrapper: createWrapper() }
      );
      const { result: myEventsResult } = renderHook(
        () => useMyEvents('user-1', 1, true),
        { wrapper: createWrapper() }
      );
      const { result: eventByIdResult } = renderHook(
        () => useEventById('event-1'),
        { wrapper: createWrapper() }
      );

      // Wait for all to complete
      await waitFor(() => {
        expect(filteredResult.current.isSuccess).toBe(true);
        expect(archivedResult.current.isSuccess).toBe(true);
        expect(myEventsResult.current.isSuccess).toBe(true);
        expect(eventByIdResult.current.isSuccess).toBe(true);
      });

      // Verify each has its own cache entry
      expect(queryClient.getQueryState(['events', 1, ['Tech']])).toBeDefined();
      expect(queryClient.getQueryState(['archivedEvents', 1])).toBeDefined();
      expect(queryClient.getQueryState(['myEvents', 'user-1', 1])).toBeDefined();
      expect(queryClient.getQueryState(['event-1'])).toBeDefined();
    });

    it('should cache data for same query key', async () => {
      const mockEvents = [createMockEvent()];
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockEvents),
      });

      // First render
      const { result: result1 } = renderHook(
        () => useFilteredEvents(1, true, ['Tech']),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result1.current.isSuccess).toBe(true));

      // Second render with same params - should use cache
      const { result: result2 } = renderHook(
        () => useFilteredEvents(1, true, ['Tech']),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result2.current.isSuccess).toBe(true));

      // Verify both have the same data
      expect(result1.current.data).toEqual(result2.current.data);
    });
  });

  describe('Edge Cases', () => {
    describe('Empty and Null Responses', () => {
      it('should handle empty array response for filtered events', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve([]),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
      });

      it('should handle undefined response', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(undefined),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true),
          { wrapper: createWrapper() }
        );

        // normalizeActivityIds handles null/undefined by returning empty array
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
      });
    });

    describe('Special Characters in Parameters', () => {
      it('should handle tags with special characters', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents(1, true, ['C++', 'C#', 'Node.js']),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(global.fetch).toHaveBeenCalled();
      });

      it('should handle event ID with special characters', async () => {
        const mockEvent = createMockEvent();
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvent),
        });

        const { result } = renderHook(
          () => useEventById('event-123-abc_def'),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('event-123-abc_def');
      });
    });

    describe('Pagination Edge Cases', () => {
      it('should handle page 0', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents(0, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('page=0');
      });

      it('should handle negative page number', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents(-1, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('page=-1');
      });

      it('should handle very large page number', async () => {
        const mockEvents: ActivityDatabase[] = [];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents(999999, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('page=999999');
      });
    });

    describe('Concurrent Requests', () => {
      it('should handle multiple concurrent queries', async () => {
        // Set up different responses for each query
        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({ json: () => Promise.resolve([createMockEvent({ id: '1' })]) })
          .mockResolvedValueOnce({ json: () => Promise.resolve([createMockEvent({ id: '2' })]) })
          .mockResolvedValueOnce({ json: () => Promise.resolve([createMockEvent({ id: '3' })]) });

        // Start all queries simultaneously
        const { result: result1 } = renderHook(
          () => useFilteredEvents(1, true, ['Tag1']),
          { wrapper: createWrapper() }
        );
        const { result: result2 } = renderHook(
          () => useFilteredEvents(2, true, ['Tag2']),
          { wrapper: createWrapper() }
        );
        const { result: result3 } = renderHook(
          () => useFilteredEvents(3, true, ['Tag3']),
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(result1.current.isSuccess).toBe(true);
          expect(result2.current.isSuccess).toBe(true);
          expect(result3.current.isSuccess).toBe(true);
        });

        expect(result1.current.data?.[0]?.id).toBe('1');
        expect(result2.current.data?.[0]?.id).toBe('2');
        expect(result3.current.data?.[0]?.id).toBe('3');
      });
    });

    describe('Type Coercion', () => {
      it('should handle numeric string as page', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents('3' as any, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('page=3');
      });

      it('should handle null page', async () => {
        const mockEvents = [createMockEvent()];
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          json: () => Promise.resolve(mockEvents),
        });

        const { result } = renderHook(
          () => useFilteredEvents(null as any, true),
          { wrapper: createWrapper() }
        );

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
        expect(fetchCall).toContain('page=null');
      });
    });
  });

  describe('Return Type Validation', () => {
    it('should return ActivityDatabase[] type for useFilteredEvents', async () => {
      const mockEvents = [createMockEvent()];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockEvents),
      });

      const { result } = renderHook(
        () => useFilteredEvents(1, true),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify the data matches ActivityDatabase type shape
      const event = result.current.data?.[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('eventTitle');
      expect(event).toHaveProperty('eventDescription');
      expect(event).toHaveProperty('eventCapacity');
      expect(event).toHaveProperty('eventTags');
    });

    it('should return ActivityDatabase type for useEventById', async () => {
      const mockEvent = createMockEvent();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockEvent),
      });

      const { result } = renderHook(
        () => useEventById('event-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify the data matches ActivityDatabase type shape
      expect(result.current.data).toHaveProperty('id');
      expect(result.current.data).toHaveProperty('eventTitle');
      expect(result.current.data).toHaveProperty('eventDescription');
    });

    it('should return boolean type for useIsAttending', async () => {
      mockLocalStorage['token'] = 'valid-token';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isRegistered: true }),
      });

      const { result } = renderHook(
        () => useIsAttending('event-1', 'user-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(typeof result.current.data).toBe('boolean');
    });
  });
});
