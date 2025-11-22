import { renderHook, act, waitFor } from '@testing-library/react';
import { useEventForm } from '@/hooks/useEventForm';
import { validateFormData } from '@/utility/validateFormData';
import { Activity, activity } from '@/models/activity';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
jest.mock('@/utility/validateFormData');
jest.mock('@/hooks/useDateTimeSelection');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock environment variable
process.env.NSC_EVENTS_PUBLIC_API_URL = 'http://localhost:3000';

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useEventForm Hook', () => {
  const mockValidateFormData = validateFormData as jest.MockedFunction<typeof validateFormData>;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  // Default initial data for tests
  const initialData: Activity = {
    ...activity,
    eventCreatorId: 'test-user-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.setItem('token', 'test-token');
    mockValidateFormData.mockReturnValue({});
    
    // Mock useDateTimeSelection
    const useDateTimeSelection = require('@/hooks/useDateTimeSelection').default;
    useDateTimeSelection.mockReturnValue({
      startTime: '10:00',
      setStartTime: jest.fn(),
      endTime: '11:00',
      setEndTime: jest.fn(),
      timeError: null,
      handleStartTimeChange: jest.fn(),
      handleEndTimeChange: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial State Setup', () => {
    it('should initialize with provided initial data', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.eventData).toEqual(initialData);
      if ('eventCreatorId' in result.current.eventData) {
        expect(result.current.eventData.eventCreatorId).toBe('test-user-123');
      }
    });

    it('should initialize with empty errors object', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.errors).toEqual({
        eventTitle: '',
        eventDescription: '',
        eventCategory: '',
        startDate: '',
        endDate: '',
        eventLocation: '',
        eventMeetingURL: '',
        eventCoverPhoto: '',
        eventDocument: '',
        eventHost: '',
        eventRegistration: '',
        eventTags: '',
        eventSchedule: '',
        eventSpeakers: '',
        eventPrerequisites: '',
        eventCancellationPolicy: '',
        eventContact: '',
        eventSocialMedia: {
          facebook: '',
          twitter: '',
          instagram: '',
          hashtag: '',
        },
        eventPrivacy: '',
        eventAccessibility: '',
        eventCapacity: '',
      });
    });

    it('should initialize with null selected date', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedDate).toBeNull();
    });

    it('should initialize with default time values from useDateTimeSelection', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.startTime).toBe('10:00');
      expect(result.current.endTime).toBe('11:00');
    });

    it('should initialize with empty success and error messages', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.successMessage).toBe('');
      expect(result.current.errorMessage).toBe('');
    });

    it('should initialize with timezone message', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.timezoneMessage).toBe(
        'All event times are recorded and displayed in the local time zone: (GMT-07:00) Pacific Time - Los Angeles'
      );
    });

    it('should initialize with null cover image state', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedCoverImage).toBeNull();
      expect(result.current.coverImagePreview).toBeNull();
      expect(result.current.coverImageError).toBe('');
    });
  });

  describe('Input Change Handlers', () => {
    it('should update event data on input change', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleInputChange({
          target: { name: 'eventTitle', value: 'New Event Title' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.eventData.eventTitle).toBe('New Event Title');
    });

    it('should update multiple fields independently', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleInputChange({
          target: { name: 'eventTitle', value: 'Test Title' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      act(() => {
        result.current.handleInputChange({
          target: { name: 'eventDescription', value: 'Test Description' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.eventData.eventTitle).toBe('Test Title');
      expect(result.current.eventData.eventDescription).toBe('Test Description');
    });

    it('should update eventHost field', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleInputChange({
          target: { name: 'eventHost', value: 'John Doe' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.eventData.eventHost).toBe('John Doe');
    });

    it('should update eventLocation field', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleInputChange({
          target: { name: 'eventLocation', value: 'Seattle, WA' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.eventData.eventLocation).toBe('Seattle, WA');
    });

    it('should update eventContact field', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleInputChange({
          target: { name: 'eventContact', value: 'test@example.com' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.eventData.eventContact).toBe('test@example.com');
    });

    it('should update eventCapacity field', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleInputChange({
          target: { name: 'eventCapacity', value: '50' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.eventData.eventCapacity).toBe('50');
    });

    it('should preserve other fields when updating one field', () => {
      const customInitialData: Activity = {
        ...initialData,
        eventTitle: 'Existing Title',
        eventDescription: 'Existing Description',
      };

      const { result } = renderHook(() => useEventForm(customInitialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleInputChange({
          target: { name: 'eventHost', value: 'New Host' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.eventData.eventTitle).toBe('Existing Title');
      expect(result.current.eventData.eventDescription).toBe('Existing Description');
      expect(result.current.eventData.eventHost).toBe('New Host');
    });
  });

  describe('Tag Selection/Deselection', () => {
    it('should add a tag when not already selected', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleTagClick('Technology');
      });

      expect(result.current.eventData.eventTags).toContain('Technology');
      expect(result.current.eventData.eventTags).toHaveLength(1);
    });

    it('should remove a tag when already selected', () => {
      const customInitialData: Activity = {
        ...initialData,
        eventTags: ['Technology', 'Workshop'],
      };

      const { result } = renderHook(() => useEventForm(customInitialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleTagClick('Technology');
      });

      expect(result.current.eventData.eventTags).not.toContain('Technology');
      expect(result.current.eventData.eventTags).toContain('Workshop');
      expect(result.current.eventData.eventTags).toHaveLength(1);
    });

    it('should handle multiple tag additions', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleTagClick('Technology');
      });

      act(() => {
        result.current.handleTagClick('Workshop');
      });

      act(() => {
        result.current.handleTagClick('Networking');
      });

      expect(result.current.eventData.eventTags).toEqual([
        'Technology',
        'Workshop',
        'Networking',
      ]);
    });

    it('should toggle tag selection correctly', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      // Add tag
      act(() => {
        result.current.handleTagClick('Technology');
      });
      expect(result.current.eventData.eventTags).toContain('Technology');

      // Remove tag
      act(() => {
        result.current.handleTagClick('Technology');
      });
      expect(result.current.eventData.eventTags).not.toContain('Technology');

      // Add tag again
      act(() => {
        result.current.handleTagClick('Technology');
      });
      expect(result.current.eventData.eventTags).toContain('Technology');
    });

    it('should not duplicate tags when clicking same tag twice without removing', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleTagClick('Technology');
      });

      const firstLength = result.current.eventData.eventTags.length;

      // Click again (should remove it)
      act(() => {
        result.current.handleTagClick('Technology');
      });

      expect(result.current.eventData.eventTags).toHaveLength(firstLength - 1);
    });
  });

  describe('Social Media Field Updates', () => {
    it('should update Facebook field', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleSocialMediaChange('facebook', 'https://facebook.com/event');
      });

      expect(result.current.eventData.eventSocialMedia.facebook).toBe(
        'https://facebook.com/event'
      );
    });

    it('should update Twitter field', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleSocialMediaChange('twitter', 'https://twitter.com/event');
      });

      expect(result.current.eventData.eventSocialMedia.twitter).toBe(
        'https://twitter.com/event'
      );
    });

    it('should update Instagram field', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleSocialMediaChange('instagram', 'https://instagram.com/event');
      });

      expect(result.current.eventData.eventSocialMedia.instagram).toBe(
        'https://instagram.com/event'
      );
    });

    it('should update hashtag field', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleSocialMediaChange('hashtag', '#TechEvent2024');
      });

      expect(result.current.eventData.eventSocialMedia.hashtag).toBe('#TechEvent2024');
    });

    it('should update multiple social media fields independently', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleSocialMediaChange('facebook', 'https://facebook.com/event');
        result.current.handleSocialMediaChange('twitter', 'https://twitter.com/event');
      });

      expect(result.current.eventData.eventSocialMedia.facebook).toBe(
        'https://facebook.com/event'
      );
      expect(result.current.eventData.eventSocialMedia.twitter).toBe(
        'https://twitter.com/event'
      );
      expect(result.current.eventData.eventSocialMedia.instagram).toBe('');
      expect(result.current.eventData.eventSocialMedia.hashtag).toBe('');
    });

    it('should preserve other social media fields when updating one', () => {
      const customInitialData: Activity = {
        ...initialData,
        eventSocialMedia: {
          facebook: 'https://facebook.com/existing',
          twitter: 'https://twitter.com/existing',
          instagram: '',
          hashtag: '',
        },
      };

      const { result } = renderHook(() => useEventForm(customInitialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleSocialMediaChange('instagram', 'https://instagram.com/new');
      });

      expect(result.current.eventData.eventSocialMedia.facebook).toBe(
        'https://facebook.com/existing'
      );
      expect(result.current.eventData.eventSocialMedia.twitter).toBe(
        'https://twitter.com/existing'
      );
      expect(result.current.eventData.eventSocialMedia.instagram).toBe(
        'https://instagram.com/new'
      );
    });

    it('should allow clearing social media fields', () => {
      const customInitialData: Activity = {
        ...initialData,
        eventSocialMedia: {
          facebook: 'https://facebook.com/event',
          twitter: 'https://twitter.com/event',
          instagram: 'https://instagram.com/event',
          hashtag: '#Event',
        },
      };

      const { result } = renderHook(() => useEventForm(customInitialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleSocialMediaChange('facebook', '');
      });

      expect(result.current.eventData.eventSocialMedia.facebook).toBe('');
      expect(result.current.eventData.eventSocialMedia.twitter).toBe(
        'https://twitter.com/event'
      );
    });
  });

  describe('Validation Integration', () => {
    it('should not trigger validation initially', () => {
      renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(mockValidateFormData).not.toHaveBeenCalled();
    });

    it('should trigger validation when form has errors after submit', () => {
      mockValidateFormData.mockReturnValue({
        eventTitle: 'Event title is required',
      });

      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleSubmit({
          preventDefault: jest.fn(),
        } as any);
      });

      expect(mockValidateFormData).toHaveBeenCalled();
    });

    it('should update errors state when validation fails', () => {
      mockValidateFormData.mockReturnValue({
        eventTitle: 'Event title is required',
        eventDescription: 'Event description is required',
      });

      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleSubmit({
          preventDefault: jest.fn(),
        } as any);
      });

      expect(result.current.errors.eventTitle).toBe('Event title is required');
      expect(result.current.errors.eventDescription).toBe('Event description is required');
    });

    it('should validate on input change after initial validation failure', async () => {
      mockValidateFormData.mockReturnValue({
        eventTitle: 'Event title is required',
      });

      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      // Trigger initial validation
      act(() => {
        result.current.handleSubmit({
          preventDefault: jest.fn(),
        } as any);
      });

      // Clear mock to track subsequent calls
      mockValidateFormData.mockClear();
      mockValidateFormData.mockReturnValue({});

      // Change input after validation has been triggered
      act(() => {
        result.current.handleInputChange({
          target: { name: 'eventTitle', value: 'Valid Title' },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Wait for the effect to run
      await waitFor(() => {
        expect(mockValidateFormData).toHaveBeenCalled();
      });
    });

    it('should set date validation errors when date is missing', () => {
      mockValidateFormData.mockReturnValue({});

      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleSubmit({
          preventDefault: jest.fn(),
        } as any);
      });

      expect(result.current.errors.startDate).toBe('start date is required');
    });

    it('should set time validation errors when times are missing', () => {
      mockValidateFormData.mockReturnValue({});

      // Mock useDateTimeSelection with empty times
      const useDateTimeSelection = require('@/hooks/useDateTimeSelection').default;
      useDateTimeSelection.mockReturnValue({
        startTime: '',
        setStartTime: jest.fn(),
        endTime: '',
        setEndTime: jest.fn(),
        timeError: null,
        handleStartTimeChange: jest.fn(),
        handleEndTimeChange: jest.fn(),
      });

      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelectedDate(new Date('2024-12-01'));
      });

      act(() => {
        result.current.handleSubmit({
          preventDefault: jest.fn(),
        } as any);
      });

      expect(result.current.errors.startDate).toBe('start time is required');
      expect(result.current.errors.endDate).toBe('end time is required');
    });

    it('should handle success/error message state', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSuccessMessage('Event created successfully!');
      });

      expect(result.current.successMessage).toBe('Event created successfully!');

      act(() => {
        result.current.setErrorMessage('Failed to create event');
      });

      expect(result.current.errorMessage).toBe('Failed to create event');
    });
  });

  describe('Date/Time Handling', () => {
    it('should allow setting selected date', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      const testDate = new Date('2024-12-15');

      act(() => {
        result.current.setSelectedDate(testDate);
      });

      expect(result.current.selectedDate).toEqual(testDate);
    });

    it('should integrate with useDateTimeSelection for start time', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.startTime).toBe('10:00');
      expect(typeof result.current.handleStartTimeChange).toBe('function');
    });

    it('should integrate with useDateTimeSelection for end time', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.endTime).toBe('11:00');
      expect(typeof result.current.handleEndTimeChange).toBe('function');
    });

    it('should integrate with useDateTimeSelection for time error', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.timeError).toBeNull();
    });

    it('should display timezone message', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.timezoneMessage).toContain('Pacific Time');
      expect(result.current.timezoneMessage).toContain('GMT-07:00');
    });
  });

  describe('to24HourTime Utility Function', () => {
    it('should return empty string for empty input', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.to24HourTime('')).toBe('');
    });

    it('should convert 12-hour time to 24-hour format with seconds', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.to24HourTime('10:00')).toBe('10:00:00');
      expect(result.current.to24HourTime('14:30')).toBe('14:30:00');
      expect(result.current.to24HourTime('09:15')).toBe('09:15:00');
    });

    it('should pad single digit hours with leading zero', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.to24HourTime('9:00')).toBe('09:00:00');
      expect(result.current.to24HourTime('5:30')).toBe('05:30:00');
    });
  });

  describe('createISODateTime Function', () => {
    it('should create ISO 8601 datetime string with timezone', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      const testDate = new Date('2024-12-15T00:00:00');
      const isoString = result.current.createISODateTime(testDate, '14:30');

      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
      expect(isoString).toContain('2024-12-15');
      expect(isoString).toContain('14:30:00');
    });

    it('should throw error when date is null', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(() => {
        result.current.createISODateTime(null, '14:30');
      }).toThrow('Date and time are required');
    });

    it('should throw error when time is empty', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      const testDate = new Date('2024-12-15');

      expect(() => {
        result.current.createISODateTime(testDate, '');
      }).toThrow('Date and time are required');
    });

    it('should handle different time formats correctly', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      const testDate = new Date('2024-12-15T00:00:00');

      const isoMorning = result.current.createISODateTime(testDate, '09:00');
      const isoAfternoon = result.current.createISODateTime(testDate, '14:30');
      const isoEvening = result.current.createISODateTime(testDate, '18:45');

      expect(isoMorning).toContain('09:00:00');
      expect(isoAfternoon).toContain('14:30:00');
      expect(isoEvening).toContain('18:45:00');
    });
  });

  describe('Form Submission', () => {
    it('should prevent default form submission', () => {
      mockValidateFormData.mockReturnValue({});

      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      const mockPreventDefault = jest.fn();

      act(() => {
        result.current.handleSubmit({
          preventDefault: mockPreventDefault,
        } as any);
      });

      expect(mockPreventDefault).toHaveBeenCalled();
    });

    it('should not submit when validation fails', () => {
      mockValidateFormData.mockReturnValue({
        eventTitle: 'Event title is required',
      });

      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleSubmit({
          preventDefault: jest.fn(),
        } as any);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not submit when date is missing', () => {
      mockValidateFormData.mockReturnValue({});

      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleSubmit({
          preventDefault: jest.fn(),
        } as any);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.errors.startDate).toBe('start date is required');
    });

    it('should submit when all validations pass', async () => {
      mockValidateFormData.mockReturnValue({});
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'Event created successfully',
          id: 'event-123',
        }),
      } as Response);

      const validEventData: Activity = {
        ...initialData,
        eventTitle: 'Test Event',
        eventDescription: 'Test Description',
        eventLocation: 'Seattle',
        eventHost: 'John Doe',
        eventContact: 'test@example.com',
        eventCapacity: 50,
        eventTags: ['Technology'],
      };

      const { result } = renderHook(() => useEventForm(validEventData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelectedDate(new Date('2024-12-15'));
      });

      await act(async () => {
        result.current.handleSubmit({
          preventDefault: jest.fn(),
        } as any);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('should set success message on successful submission', async () => {
      mockValidateFormData.mockReturnValue({});
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'Event created successfully',
          id: 'event-123',
        }),
      } as Response);

      const validEventData: Activity = {
        ...initialData,
        eventTitle: 'Test Event',
        eventDescription: 'Test Description',
        eventLocation: 'Seattle',
        eventHost: 'John Doe',
        eventContact: 'test@example.com',
        eventCapacity: 50,
        eventTags: ['Technology'],
      };

      const { result } = renderHook(() => useEventForm(validEventData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelectedDate(new Date('2024-12-15'));
      });

      await act(async () => {
        result.current.handleSubmit({
          preventDefault: jest.fn(),
        } as any);
      });

      await waitFor(() => {
        expect(result.current.successMessage).toBeTruthy();
      });
    });

    it('should set error message on failed submission', async () => {
      mockValidateFormData.mockReturnValue({});
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          message: 'Failed to create event',
        }),
      } as Response);

      const validEventData: Activity = {
        ...initialData,
        eventTitle: 'Test Event',
        eventDescription: 'Test Description',
        eventLocation: 'Seattle',
        eventHost: 'John Doe',
        eventContact: 'test@example.com',
        eventCapacity: 50,
        eventTags: ['Technology'],
      };

      const { result } = renderHook(() => useEventForm(validEventData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelectedDate(new Date('2024-12-15'));
      });

      await act(async () => {
        result.current.handleSubmit({
          preventDefault: jest.fn(),
        } as any);
      });

      await waitFor(() => {
        expect(result.current.errorMessage).toBeTruthy();
      });
    });
  });

  describe('State Setters', () => {
    it('should allow setting event data directly', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      const newEventData: Activity = {
        ...initialData,
        eventTitle: 'Updated Title',
      };

      act(() => {
        result.current.setEventData(newEventData);
      });

      expect(result.current.eventData.eventTitle).toBe('Updated Title');
    });

    it('should allow setting errors directly', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      const newErrors = {
        eventTitle: 'Custom error message',
      };

      act(() => {
        result.current.setErrors(newErrors as any);
      });

      expect(result.current.errors.eventTitle).toBe('Custom error message');
    });

    it('should allow setting success message', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSuccessMessage('Custom success');
      });

      expect(result.current.successMessage).toBe('Custom success');
    });

    it('should allow setting error message', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setErrorMessage('Custom error');
      });

      expect(result.current.errorMessage).toBe('Custom error');
    });
  });

  describe('Cover Image Management', () => {
    it('should allow setting selected cover image', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.setSelectedCoverImage(mockFile);
      });

      expect(result.current.selectedCoverImage).toBe(mockFile);
    });

    it('should allow setting cover image preview', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCoverImagePreview('data:image/jpeg;base64,abc123');
      });

      expect(result.current.coverImagePreview).toBe('data:image/jpeg;base64,abc123');
    });

    it('should initialize cover image error as empty string', () => {
      const { result } = renderHook(() => useEventForm(initialData), {
        wrapper: createWrapper(),
      });

      expect(result.current.coverImageError).toBe('');
    });
  });

  describe('API Integration', () => {
    it('should include authorization header with token', async () => {
      mockValidateFormData.mockReturnValue({});
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'Event created successfully',
          id: 'event-123',
        }),
      } as Response);

      const validEventData: Activity = {
        ...initialData,
        eventTitle: 'Test Event',
        eventDescription: 'Test Description',
        eventLocation: 'Seattle',
        eventHost: 'John Doe',
        eventContact: 'test@example.com',
        eventCapacity: 50,
        eventTags: ['Technology'],
      };

      const { result } = renderHook(() => useEventForm(validEventData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelectedDate(new Date('2024-12-15'));
      });

      await act(async () => {
        result.current.handleSubmit({
          preventDefault: jest.fn(),
        } as any);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/events/new'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          })
        );
      });
    });

    it('should send data as FormData for multipart upload', async () => {
      mockValidateFormData.mockReturnValue({});
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'Event created successfully',
          id: 'event-123',
        }),
      } as Response);

      const validEventData: Activity = {
        ...initialData,
        eventTitle: 'Test Event',
        eventDescription: 'Test Description',
        eventLocation: 'Seattle',
        eventHost: 'John Doe',
        eventContact: 'test@example.com',
        eventCapacity: 50,
        eventTags: ['Technology'],
      };

      const { result } = renderHook(() => useEventForm(validEventData), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelectedDate(new Date('2024-12-15'));
      });

      await act(async () => {
        result.current.handleSubmit({
          preventDefault: jest.fn(),
        } as any);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        );
      });
    });
  });
});
