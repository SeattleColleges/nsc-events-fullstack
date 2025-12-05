import { render, screen, waitFor } from '@testing-library/react';
import ArchivedEvents from '@/app/archived-events/page';
import useAuth from '@/hooks/useAuth';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';

jest.mock('@/hooks/useAuth');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/components/UnauthorizedPageMessage', () => () => <div>Unauthorized</div>);
jest.mock('@/components/EventCard', () => ({ event }: any) => (
  <div data-testid={`event-${event.id}`}>{event.eventTitle}</div>
));
jest.mock('@/components/ArchiveDialog', () => () => <div>Archive Dialog</div>);

// Mock Material UI components that might cause issues
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useTheme: () => ({
    palette: { mode: 'light' },
    breakpoints: {
      between: () => '',
      up: () => '',
      down: () => '',
      only: () => '',
      not: () => '',
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
  }),
  useMediaQuery: () => false, // Default to desktop view
}));

describe('ArchivedEvents Page', () => {
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });

    // Mock fetch for API calls
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => [
          {
            id: '1',
            eventTitle: 'Archived Event 1',
            startDate: '2024-11-15',
            eventLocation: 'Seattle',
            eventHost: 'NSC',
            eventContact: 'test@example.com',
            isArchived: true,
          },
          {
            id: '2',
            eventTitle: 'Archived Event 2',
            startDate: '2024-12-01',
            eventLocation: 'Tacoma',
            eventHost: 'NSC',
            eventContact: 'test2@example.com',
            isArchived: true,
          },
        ],
      }),
    ) as jest.Mock;

    // Set environment variable
    process.env.NSC_EVENTS_PUBLIC_API_URL = 'http://localhost:3000/api';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders UnauthorizedPageMessage if the user is not authorized', () => {
    (useAuth as jest.Mock).mockReturnValue({ isAuth: false, user: null });
    render(<ArchivedEvents />);
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });

  it('renders UnauthorizedPageMessage if the user is not admin or creator', () => {
    (useAuth as jest.Mock).mockReturnValue({ isAuth: true, user: { role: 'user' } });
    render(<ArchivedEvents />);
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });

  it('renders the archived events page for admin users', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isAuth: true, user: { role: 'admin' } });

    render(<ArchivedEvents />);

    // Check for page title
    expect(screen.getByText('Archived Events')).toBeInTheDocument();

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Archived Event 1')).toBeInTheDocument();
      expect(screen.getByText('Archived Event 2')).toBeInTheDocument();
    });
  });

  it('renders the archived events page for creator users', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isAuth: true, user: { role: 'creator' } });

    render(<ArchivedEvents />);

    // Check for page title
    expect(screen.getByText('Archived Events')).toBeInTheDocument();

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('Archived Event 1')).toBeInTheDocument();
    });
  });

  it('fetches archived events with correct parameters', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isAuth: true, user: { role: 'admin' } });

    render(<ArchivedEvents />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('isArchived=true'),
      );
    });
  });
});
