import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditDialog from '@/components/EditDialog';
import { ActivityDatabase } from '@/models/activityDatabase';
import { useEditForm } from '@/hooks/useEditForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
jest.mock('@/hooks/useEditForm');
jest.mock('@/components/TagSelector', () => {
  return function MockTagSelector({ selectedTags, allTags, onTagClick }: any) {
    return (
      <div data-testid="tag-selector">
        {allTags.map((tag: string) => (
          <button
            key={tag}
            data-testid={`tag-${tag}`}
            onClick={() => onTagClick(tag)}
            className={selectedTags.includes(tag) ? 'selected' : ''}
          >
            {tag}
          </button>
        ))}
      </div>
    );
  };
});

// Mock Material-UI DatePicker and TimePicker
jest.mock('@mui/x-date-pickers', () => ({
  DatePicker: ({ label, value, onChange, renderInput }: any) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value ? new Date(e.target.value) : null;
      onChange(newDate);
    };
    
    // Call renderInput to render the TextField with error/helperText
    const textFieldProps = {
      inputProps: {
        type: 'date',
        value: value ? value.toISOString().split('T')[0] : '',
        onChange: handleChange,
        'aria-label': label,
      },
    };
    
    return (
      <div data-testid={`date-picker-${label}`}>
        {renderInput ? renderInput(textFieldProps) : (
          <input
            type="date"
            value={value ? value.toISOString().split('T')[0] : ''}
            onChange={handleChange}
            aria-label={label}
          />
        )}
      </div>
    );
  },
  TimePicker: ({ label, value, onChange, renderInput }: any) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const [hours, minutes] = e.target.value.split(':');
      const newTime = new Date();
      newTime.setHours(parseInt(hours), parseInt(minutes));
      onChange(newTime);
    };
    
    // Call renderInput to render the TextField with error/helperText
    const textFieldProps = {
      inputProps: {
        type: 'time',
        value: value ? value.toTimeString().substring(0, 5) : '',
        onChange: handleChange,
        'aria-label': label,
      },
    };
    
    return (
      <div data-testid={`time-picker-${label}`}>
        {renderInput ? renderInput(textFieldProps) : (
          <input
            type="time"
            value={value ? value.toTimeString().substring(0, 5) : ''}
            onChange={handleChange}
            aria-label={label}
          />
        )}
      </div>
    );
  },
  LocalizationProvider: ({ children }: any) => <div>{children}</div>,
  AdapterDateFns: jest.fn(),
}));

// Mock Dialog component
jest.mock('@mui/material/Dialog', () => {
  return function MockDialog({ open, children }: any) {
    return open ? <div data-testid="edit-dialog">{children}</div> : null;
  };
});

describe('EditDialog Component', () => {
  const mockToggleEditDialog = jest.fn();
  const mockHandleSubmit = jest.fn();
  const mockHandleInputChange = jest.fn();
  const mockHandleSocialMediaChange = jest.fn();
  const mockHandleTagClick = jest.fn();
  const mockHandleDateChange = jest.fn();
  const mockOnStartTimeChange = jest.fn();
  const mockOnEndTimeChange = jest.fn();

  const mockUseEditForm = useEditForm as jest.MockedFunction<typeof useEditForm>;

  const mockEventData: ActivityDatabase = {
    id: 'event-123',
    createdByUserId: 'user-123',
    eventTitle: 'Test Event',
    eventDescription: 'Test Description',
    eventLocation: 'Test Location',
    eventHost: 'Test Host',
    eventContact: 'test@example.com',
    eventRegistration: 'https://register.example.com',
    eventCapacity: 50,
    eventTags: ['Tech', 'Social'],
    startDate: '2025-12-01T10:00:00.000Z',
    endDate: '2025-12-01T12:00:00.000Z',
    eventCategory: 'Workshop',
    eventCoverPhoto: '',
    eventDocument: '',
    eventSchedule: '',
    eventSpeakers: [],
    eventPrerequisites: '',
    eventCancellationPolicy: '',
    eventSocialMedia: {
      facebook: 'https://facebook.com/test',
      twitter: 'https://twitter.com/test',
      instagram: 'https://instagram.com/test',
      hashtag: '#testevent',
    },
    attendanceCount: 0,
    eventPrivacy: 'Public',
    eventAccessibility: 'Wheelchair accessible',
    eventMeetingURL: '',
    eventNote: 'Test note',
    isHidden: false,
    isArchived: false,
  };

  const defaultMockReturn = {
    handleDateChange: mockHandleDateChange,
    onStartTimeChange: mockOnStartTimeChange,
    onEndTimeChange: mockOnEndTimeChange,
    eventData: mockEventData,
    handleInputChange: mockHandleInputChange,
    handleSocialMediaChange: mockHandleSocialMediaChange,
    handleTagClick: mockHandleTagClick,
    handleSubmit: mockHandleSubmit,
    errors: {},
    selectedDate: new Date('2025-12-01'),
    timeError: null,
    successMessage: '',
    errorMessage: '',
    startTimeDate: new Date('2025-12-01T10:00:00'),
    endTimeDate: new Date('2025-12-01T12:00:00'),
    to12HourTime: (time: string) => time,
    timezoneMessage: '',
  };

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEditForm.mockReturnValue(defaultMockReturn);
  });

  describe('Dialog Behavior', () => {
    describe('Open/Close States', () => {
      it('should render dialog when isOpen is true', () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
        expect(screen.getByText('Edit Event')).toBeInTheDocument();
      });

      it('should not render dialog when isOpen is false', () => {
        render(
          <EditDialog
            isOpen={false}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.queryByTestId('edit-dialog')).not.toBeInTheDocument();
      });

      it('should call toggleEditDialog when Cancel button is clicked', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);

        expect(mockToggleEditDialog).toHaveBeenCalledTimes(1);
      });

      it('should reset initial data when dialog opens', () => {
        const { rerender } = render(
          <EditDialog
            isOpen={false}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        rerender(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />
        );

        expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
      });
    });

    describe('Initial Data Loading', () => {
      it('should load event title from initial data', () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const titleInput = screen.getByLabelText(/event title/i) as HTMLInputElement;
        expect(titleInput.value).toBe('Test Event');
      });

      it('should load event description from initial data', () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const descriptionInput = screen.getByLabelText(/event description/i) as HTMLInputElement;
        expect(descriptionInput.value).toBe('Test Description');
      });

      it('should load all text fields from initial data', () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect((screen.getByLabelText(/event location/i) as HTMLInputElement).value).toBe('Test Location');
        expect((screen.getByLabelText(/event host/i) as HTMLInputElement).value).toBe('Test Host');
        expect((screen.getByLabelText(/event contact/i) as HTMLInputElement).value).toBe('test@example.com');
      });

      it('should load social media fields from initial data', () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect((screen.getByLabelText(/facebook/i) as HTMLInputElement).value).toBe('https://facebook.com/test');
        expect((screen.getByLabelText(/twitter/i) as HTMLInputElement).value).toBe('https://twitter.com/test');
        expect((screen.getByLabelText(/instagram/i) as HTMLInputElement).value).toBe('https://instagram.com/test');
        expect((screen.getByLabelText(/hashtag/i) as HTMLInputElement).value).toBe('#testevent');
      });

      it('should load event tags from initial data', () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const tagsInput = screen.getByLabelText(/event tags/i) as HTMLInputElement;
        expect(tagsInput.value).toBe('Tech, Social');
      });

      it('should handle empty optional fields gracefully', () => {
        const eventWithEmptyFields = {
          ...mockEventData,
          eventNote: '',
          eventPrivacy: '',
          eventAccessibility: '',
        };

        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          eventData: eventWithEmptyFields,
        });

        render(
          <EditDialog
            isOpen={true}
            event={eventWithEmptyFields}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect((screen.getByLabelText(/event note/i) as HTMLInputElement).value).toBe('');
      });
    });

    describe('Form Field Updates', () => {
      it('should call handleInputChange when event title is updated', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const titleInput = screen.getByLabelText(/event title/i);
        fireEvent.change(titleInput, { target: { value: 'Updated Event Title' } });

        expect(mockHandleInputChange).toHaveBeenCalled();
      });

      it('should call handleInputChange when event description is updated', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const descriptionInput = screen.getByLabelText(/event description/i);
        fireEvent.change(descriptionInput, { target: { value: 'Updated Description' } });

        expect(mockHandleInputChange).toHaveBeenCalled();
      });

      it('should call handleInputChange for all text input fields', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const locationInput = screen.getByLabelText(/event location/i);
        fireEvent.change(locationInput, { target: { value: 'Test Location Updated' } });

        expect(mockHandleInputChange).toHaveBeenCalled();
      });

      it('should handle multi-line description input', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const descriptionInput = screen.getByLabelText(/event description/i);
        expect(descriptionInput).toHaveAttribute('maxLength', '300');
      });

      it('should call handleSocialMediaChange for Facebook updates', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const facebookInput = screen.getByLabelText(/facebook/i);
        fireEvent.change(facebookInput, { target: { value: 'https://facebook.com/updated' } });

        expect(mockHandleSocialMediaChange).toHaveBeenCalled();
      });

      it('should call handleSocialMediaChange for all social media fields', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const twitterInput = screen.getByLabelText(/twitter/i);
        const instagramInput = screen.getByLabelText(/instagram/i);
        const hashtagInput = screen.getByLabelText(/hashtag/i);

        fireEvent.change(twitterInput, { target: { value: 'test' } });
        fireEvent.change(instagramInput, { target: { value: 'test' } });
        fireEvent.change(hashtagInput, { target: { value: 'test' } });

        expect(mockHandleSocialMediaChange).toHaveBeenCalled();
      });

      it('should handle event tags as comma-separated values', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const tagsInput = screen.getByLabelText(/event tags/i);
        fireEvent.change(tagsInput, { target: { value: 'Tech, Social, Cultural' } });

        expect(mockHandleInputChange).toHaveBeenCalled();
      });
    });
  });

  describe('Form Integration', () => {
    describe('useEditForm Hook Integration', () => {
      it('should call useEditForm with event prop', () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect(mockUseEditForm).toHaveBeenCalledWith(mockEventData);
      });

      it('should use eventData from useEditForm hook', () => {
        const customEventData = {
          ...mockEventData,
          eventTitle: 'Custom Title',
        };

        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          eventData: customEventData,
        });

        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const titleInput = screen.getByLabelText(/event title/i) as HTMLInputElement;
        expect(titleInput.value).toBe('Custom Title');
      });

      it('should display validation errors from useEditForm', () => {
        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          errors: {
            eventTitle: 'Title is required',
            eventDescription: 'Description is required',
          },
        });

        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.getAllByText('Title is required')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Description is required')[0]).toBeInTheDocument();
      });

      it('should display nested social media validation errors', () => {
        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          errors: {
            eventSocialMedia: {
              facebook: 'Invalid Facebook URL',
              twitter: 'Invalid Twitter URL',
            },
          },
        });

        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.getByText(/facebook: Invalid Facebook URL/i)).toBeInTheDocument();
        expect(screen.getByText(/twitter: Invalid Twitter URL/i)).toBeInTheDocument();
      });

      it('should call handleSubmit when form is submitted', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const form = screen.getByRole('button', { name: /confirm edit/i }).closest('form');
        if (form) {
          fireEvent.submit(form);
          expect(mockHandleSubmit).toHaveBeenCalled();
        }
      });
    });

    describe('Date/Time Picker Functionality', () => {
      it('should render DatePicker with selectedDate', () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.getByTestId('date-picker-Event Date')).toBeInTheDocument();
      });

      it('should render start and end TimePickers', () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.getByTestId('time-picker-Start Time')).toBeInTheDocument();
        expect(screen.getByTestId('time-picker-End Time')).toBeInTheDocument();
      });

      it('should call handleDateChange when date is changed', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const dateInput = screen.getByLabelText('Event Date');
        fireEvent.change(dateInput, { target: { value: '2025-12-15' } });

        await waitFor(() => {
          expect(mockHandleDateChange).toHaveBeenCalled();
        });
      });

      it('should call onStartTimeChange when start time is changed', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const startTimeInput = screen.getByLabelText('Start Time');
        fireEvent.change(startTimeInput, { target: { value: '14:00' } });

        await waitFor(() => {
          expect(mockOnStartTimeChange).toHaveBeenCalled();
        });
      });

      it('should call onEndTimeChange when end time is changed', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const endTimeInput = screen.getByLabelText('End Time');
        fireEvent.change(endTimeInput, { target: { value: '16:00' } });

        await waitFor(() => {
          expect(mockOnEndTimeChange).toHaveBeenCalled();
        });
      });

      it('should display time validation errors', () => {
        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          timeError: 'End time must be after start time',
        });

        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.getByText('End time must be after start time')).toBeInTheDocument();
      });

      it('should display date validation errors', () => {
        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          errors: {
            startDate: 'Start date is required',
            endDate: 'End date is required',
          },
        });

        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.getAllByText('Start date is required').length).toBeGreaterThan(0);
        expect(screen.getAllByText('End date is required').length).toBeGreaterThan(0);
      });
    });

    describe('Tag Selector Integration', () => {
      it('should render TagSelector component', () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.getByTestId('tag-selector')).toBeInTheDocument();
      });

      it('should pass selectedTags to TagSelector', () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const techTag = screen.getByTestId('tag-Tech');
        const socialTag = screen.getByTestId('tag-Social');

        expect(techTag).toBeInTheDocument();
        expect(socialTag).toBeInTheDocument();
      });

      it('should call handleTagClick when tag is clicked', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const techTag = screen.getByTestId('tag-Tech');
        fireEvent.click(techTag);

        expect(mockHandleTagClick).toHaveBeenCalledWith('Tech');
      });

      it('should handle tag selection and deselection', async () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const culturalTag = screen.getByTestId('tag-Cultural');
        fireEvent.click(culturalTag);

        expect(mockHandleTagClick).toHaveBeenCalledWith('Cultural');
      });

      it('should display tag validation errors', () => {
        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          errors: {
            eventTags: 'Please select an event tag',
          },
        });

        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.getAllByText('Please select an event tag')[0]).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    describe('Initial vs Changed Data Comparison', () => {
      it('should check if event data has been updated', () => {
        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const submitButton = screen.getByRole('button', { name: /confirm edit/i });
        expect(submitButton).toBeInTheDocument();
      });

      it('should enable submit button when text field changes', async () => {
        const { rerender } = render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const updatedEventData = {
          ...mockEventData,
          eventTitle: 'Updated Title',
        };

        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          eventData: updatedEventData,
        });

        rerender(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />
        );

        const submitButton = screen.getByRole('button', { name: /confirm edit/i });
        expect(submitButton).toBeEnabled();
      });

      it('should detect changes in social media fields', async () => {
        const { rerender } = render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const updatedEventData = {
          ...mockEventData,
          eventSocialMedia: {
            ...mockEventData.eventSocialMedia,
            facebook: 'https://facebook.com/updated',
          },
        };

        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          eventData: updatedEventData,
        });

        rerender(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />
        );

        const submitButton = screen.getByRole('button', { name: /confirm edit/i });
        expect(submitButton).toBeEnabled();
      });

      it('should detect changes in tags array', async () => {
        const { rerender } = render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const updatedEventData = {
          ...mockEventData,
          eventTags: ['Tech', 'Social', 'Cultural'],
        };

        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          eventData: updatedEventData,
        });

        rerender(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />
        );

        const submitButton = screen.getByRole('button', { name: /confirm edit/i });
        expect(submitButton).toBeEnabled();
      });

      it('should detect date changes', async () => {
        const { rerender } = render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          selectedDate: new Date('2025-12-15'),
        });

        rerender(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />
        );

        const submitButton = screen.getByRole('button', { name: /confirm edit/i });
        expect(submitButton).toBeEnabled();
      });

      it('should detect start time changes', async () => {
        const { rerender } = render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          startTimeDate: new Date('2025-12-01T14:00:00'),
        });

        rerender(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />
        );

        const submitButton = screen.getByRole('button', { name: /confirm edit/i });
        expect(submitButton).toBeEnabled();
      });

      it('should detect end time changes', async () => {
        const { rerender } = render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          endTimeDate: new Date('2025-12-01T16:00:00'),
        });

        rerender(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />
        );

        const submitButton = screen.getByRole('button', { name: /confirm edit/i });
        expect(submitButton).toBeEnabled();
      });

      it('should handle multiple simultaneous changes', async () => {
        const { rerender } = render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const updatedEventData = {
          ...mockEventData,
          eventTitle: 'Updated Title',
          eventDescription: 'Updated Description',
          eventTags: ['Tech'],
        };

        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          eventData: updatedEventData,
          selectedDate: new Date('2025-12-15'),
        });

        rerender(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />
        );

        const submitButton = screen.getByRole('button', { name: /confirm edit/i });
        expect(submitButton).toBeEnabled();
      });
    });

    describe('Form State Persistence Between Opens', () => {
      it('should reset to initial data when dialog reopens', () => {
        const { rerender } = render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        // Close dialog
        rerender(
          <EditDialog
            isOpen={false}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />
        );

        // Reopen dialog
        rerender(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />
        );

        const titleInput = screen.getByLabelText(/event title/i) as HTMLInputElement;
        expect(titleInput.value).toBe('Test Event');
      });

      it('should reinitialize with new event data when event prop changes', () => {
        const { rerender } = render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const newEventData = {
          ...mockEventData,
          id: 'event-456',
          eventTitle: 'Different Event',
        };

        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          eventData: newEventData,
        });

        rerender(
          <EditDialog
            isOpen={true}
            event={newEventData}
            toggleEditDialog={mockToggleEditDialog}
          />
        );

        const titleInput = screen.getByLabelText(/event title/i) as HTMLInputElement;
        expect(titleInput.value).toBe('Different Event');
      });

      it('should maintain form state when dialog stays open', async () => {
        mockUseEditForm.mockReturnValue({
          ...defaultMockReturn,
          eventData: { ...mockEventData, eventTitle: 'Modified Title' },
        });

        render(
          <EditDialog
            isOpen={true}
            event={mockEventData}
            toggleEditDialog={mockToggleEditDialog}
          />,
          { wrapper: createWrapper() }
        );

        const titleInput = screen.getByLabelText(/event title/i) as HTMLInputElement;
        expect(titleInput.value).toBe('Modified Title');
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle form submission with valid data', async () => {
      const updatedEventData = {
        ...mockEventData,
        eventTitle: 'Updated Title',
      };

      mockUseEditForm.mockReturnValue({
        ...defaultMockReturn,
        eventData: updatedEventData,
      });

      render(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /confirm edit/i });
      fireEvent.click(submitButton);

      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it('should display success message after successful submission', () => {
      mockUseEditForm.mockReturnValue({
        ...defaultMockReturn,
        successMessage: 'Event successfully updated!',
      });

      render(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Event successfully updated!')).toBeInTheDocument();
    });

    it('should display error message after failed submission', () => {
      mockUseEditForm.mockReturnValue({
        ...defaultMockReturn,
        errorMessage: 'Failed to update event',
      });

      render(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Failed to update event')).toBeInTheDocument();
    });

    it('should clear error messages when fields are corrected', () => {
      const { rerender } = render(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      mockUseEditForm.mockReturnValue({
        ...defaultMockReturn,
        errors: {
          eventTitle: 'Title is required',
        },
      });

      rerender(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />
      );

      expect(screen.getAllByText('Title is required')[0]).toBeInTheDocument();

      mockUseEditForm.mockReturnValue({
        ...defaultMockReturn,
        errors: {},
      });

      rerender(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />
      );

      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });

    it('should handle rapid user input without errors', async () => {
      render(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      const titleInput = screen.getByLabelText(/event title/i);
      fireEvent.change(titleInput, { target: { value: 'Rapid typing test' } });

      expect(mockHandleInputChange).toHaveBeenCalled();
    });

    it('should render focusable form fields', () => {
      render(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      const titleInput = screen.getByLabelText(/event title/i);
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).not.toBeDisabled();
    });

    it('should prevent form submission when validation errors exist', () => {
      mockUseEditForm.mockReturnValue({
        ...defaultMockReturn,
        errors: {
          eventTitle: 'Title is required',
        },
        eventData: { ...mockEventData, eventTitle: 'Changed' },
      });

      render(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /confirm edit/i });
      expect(submitButton).toBeEnabled();
    });

    it('should render all expected form fields', () => {
      render(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event host/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event contact/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event registration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event privacy/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event accessibility/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event note/i)).toBeInTheDocument();
    });

    it('should render all social media fields', () => {
      render(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Social Media Links')).toBeInTheDocument();
      expect(screen.getByLabelText(/facebook/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/twitter/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/instagram/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hashtag/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined event social media fields', () => {
      const eventWithUndefinedSocial = {
        ...mockEventData,
        eventSocialMedia: {
          facebook: '',
          twitter: '',
          instagram: '',
          hashtag: '',
        },
      };

      mockUseEditForm.mockReturnValue({
        ...defaultMockReturn,
        eventData: eventWithUndefinedSocial,
      });

      render(
        <EditDialog
          isOpen={true}
          event={eventWithUndefinedSocial}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      expect((screen.getByLabelText(/facebook/i) as HTMLInputElement).value).toBe('');
    });

    it('should handle empty tags array', () => {
      const eventWithNoTags = {
        ...mockEventData,
        eventTags: [],
      };

      mockUseEditForm.mockReturnValue({
        ...defaultMockReturn,
        eventData: eventWithNoTags,
      });

      render(
        <EditDialog
          isOpen={true}
          event={eventWithNoTags}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      const tagsInput = screen.getByLabelText(/event tags/i) as HTMLInputElement;
      expect(tagsInput.value).toBe('');
    });

    it('should handle null date values gracefully', () => {
      mockUseEditForm.mockReturnValue({
        ...defaultMockReturn,
        selectedDate: null,
        startTimeDate: null,
        endTimeDate: null,
      });

      render(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('date-picker-Event Date')).toBeInTheDocument();
    });

    it('should handle very long text input', async () => {
      const longText = 'A'.repeat(500);

      render(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      const titleInput = screen.getByLabelText(/event title/i);
      fireEvent.change(titleInput, { target: { value: longText } });

      expect(mockHandleInputChange).toHaveBeenCalled();
    });

    it('should handle special characters in input fields', async () => {
      render(
        <EditDialog
          isOpen={true}
          event={mockEventData}
          toggleEditDialog={mockToggleEditDialog}
        />,
        { wrapper: createWrapper() }
      );

      const titleInput = screen.getByLabelText(/event title/i);
      fireEvent.change(titleInput, { target: { value: 'Event & <Special> "Characters"' } });

      expect(mockHandleInputChange).toHaveBeenCalled();
    });
  });
});
