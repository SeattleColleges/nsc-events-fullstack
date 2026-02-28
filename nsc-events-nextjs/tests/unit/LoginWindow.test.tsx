import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import '@testing-library/jest-dom';

// Set environment variable before importing component (matches pattern in queries.test.ts)
process.env.NSC_EVENTS_PUBLIC_API_URL = 'http://localhost:3001';

import LoginWindow from '@/components/LoginWindow';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

// Helper to create a valid JWT token
const createMockJWT = (payload: object): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${header}.${body}.${signature}`;
};

describe('LoginWindow Component', () => {
  const theme = createTheme();

  // Store original console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  const renderLoginWindow = () => {
    return render(
      <ThemeProvider theme={theme}>
        <LoginWindow />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock window.dispatchEvent
    jest.spyOn(window, 'dispatchEvent').mockImplementation(() => true);

    // Suppress console logs during tests
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    cleanup();
  });

  describe('Rendering', () => {
    it('should render the login form with all required elements', () => {
      renderLoginWindow();

      // Check for heading
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();

      // Check for email input
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();

      // Check for password input by id
      expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
      expect(document.getElementById('password')).toBeInTheDocument();

      // Check for login button
      expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();

      // Check for forgot password link
      expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();

      // Check for sign up link
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();

      // Check for download app button
      expect(screen.getByRole('button', { name: /download app/i })).toBeInTheDocument();
    });

    it('should render email and password section labels', () => {
      renderLoginWindow();

      // Use getAllByText since there are multiple elements with these texts
      const emailLabels = screen.getAllByText('Email');
      const passwordLabels = screen.getAllByText('Password');

      expect(emailLabels.length).toBeGreaterThan(0);
      expect(passwordLabels.length).toBeGreaterThan(0);
    });

    it('should render forgot password link with correct href', () => {
      renderLoginWindow();

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password');
    });

    it('should render sign up link with correct href', () => {
      renderLoginWindow();

      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      expect(signUpLink).toHaveAttribute('href', '/auth/sign-up');
    });

    it('should render Google Play image in download button', () => {
      renderLoginWindow();

      const googlePlayImage = screen.getByAltText('google_play');
      expect(googlePlayImage).toBeInTheDocument();
      expect(googlePlayImage).toHaveAttribute('src', '/images/google_play.png');
    });
  });

  describe('Form State Management', () => {
    it('should initialize with empty email and password fields', () => {
      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const passwordInput = document.getElementById('password') as HTMLInputElement;

      expect(emailInput.value).toBe('');
      expect(passwordInput.value).toBe('');
    });

    it('should update email state when user types in email field', () => {
      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput.value).toBe('test@example.com');
    });

    it('should update password state when user types in password field', () => {
      renderLoginWindow();

      const passwordInput = document.getElementById('password') as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'secretpassword123' } });

      expect(passwordInput.value).toBe('secretpassword123');
    });

    it('should update both email and password independently', () => {
      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const passwordInput = document.getElementById('password') as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'user@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'mypassword' } });

      expect(emailInput.value).toBe('user@test.com');
      expect(passwordInput.value).toBe('mypassword');
    });

    it('should preserve email when password is updated', () => {
      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const passwordInput = document.getElementById('password') as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'first@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass1' } });
      fireEvent.change(passwordInput, { target: { value: 'pass2' } });

      expect(emailInput.value).toBe('first@test.com');
      expect(passwordInput.value).toBe('pass2');
    });

    it('should preserve password when email is updated', () => {
      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const passwordInput = document.getElementById('password') as HTMLInputElement;

      fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
      fireEvent.change(emailInput, { target: { value: 'new@test.com' } });

      expect(emailInput.value).toBe('new@test.com');
      expect(passwordInput.value).toBe('mypassword');
    });

    it('should handle special characters in email', () => {
      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'user+tag@example.com' } });

      expect(emailInput.value).toBe('user+tag@example.com');
    });

    it('should handle special characters in password', () => {
      renderLoginWindow();

      const passwordInput = document.getElementById('password') as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'P@$$w0rd!#%&*' } });

      expect(passwordInput.value).toBe('P@$$w0rd!#%&*');
    });
  });

  describe('Form Submission', () => {
    it('should call fetch with correct URL and payload on form submission', async () => {
      const mockToken = createMockJWT({ role: 'user', email: 'test@example.com' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/login'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'password123',
            }),
          })
        );
      });
    });

    it('should prevent default form submission behavior', async () => {
      const mockToken = createMockJWT({ role: 'user' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const form = screen.getByRole('button', { name: /^login$/i }).closest('form');
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      const preventDefaultSpy = jest.spyOn(submitEvent, 'preventDefault');

      fireEvent(form!, submitEvent);

      // The component should handle the event
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('JWT Token Parsing', () => {
    it('should correctly parse JWT token and extract admin role', async () => {
      const mockToken = createMockJWT({ role: 'admin', email: 'admin@example.com' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'adminpass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin');
      });
    });

    it('should correctly parse JWT token and extract creator role', async () => {
      const mockToken = createMockJWT({ role: 'creator', email: 'creator@example.com' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'creator@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'creatorpass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/creator');
      });
    });

    it('should correctly parse JWT token and extract user role', async () => {
      const mockToken = createMockJWT({ role: 'user', email: 'user@example.com' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'userpass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should handle invalid JWT token format', async () => {
      const invalidToken = 'invalid-token-format';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: invalidToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid token format')).toBeInTheDocument();
      });
    });

    it('should handle JWT token with malformed base64 payload', async () => {
      const malformedToken = 'header.!!!invalid-base64!!!.signature';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: malformedToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid token format')).toBeInTheDocument();
      });
    });

    it('should handle JWT token with invalid JSON in payload', async () => {
      const header = btoa(JSON.stringify({ alg: 'HS256' }));
      const invalidJsonPayload = btoa('not valid json');
      const invalidToken = `${header}.${invalidJsonPayload}.signature`;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: invalidToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid token format')).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Navigation', () => {
    it('should redirect admin users to /admin', async () => {
      const mockToken = createMockJWT({ role: 'admin' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'admin@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'adminpass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin');
      });
    });

    it('should redirect creator users to /creator', async () => {
      const mockToken = createMockJWT({ role: 'creator' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'creator@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'creatorpass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/creator');
      });
    });

    it('should redirect regular users to home page', async () => {
      const mockToken = createMockJWT({ role: 'user' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'user@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'userpass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should redirect to home page for unknown roles', async () => {
      const mockToken = createMockJWT({ role: 'unknown_role' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'unknown@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should redirect to home page when role is undefined', async () => {
      const mockToken = createMockJWT({ email: 'user@test.com' }); // No role field
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'norole@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        // With no role, should redirect to home
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message for invalid credentials (401/403)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'wrong@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });

    it('should display error when login response is missing token', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Success but no token' }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Login response missing token')).toBeInTheDocument();
      });
    });

    it('should display error when fetch throws an exception', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('An error occurred during login')).toBeInTheDocument();
      });
    });

    it('should log error to console when fetch fails', async () => {
      const networkError = new Error('Network error');
      global.fetch = jest.fn().mockRejectedValue(networkError);

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Login error:', networkError);
      });
    });

    it('should display error for server error (500)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });

    it('should not display error message initially', () => {
      renderLoginWindow();

      // Ensure no error message is shown on initial render
      expect(screen.queryByText('Invalid email or password')).not.toBeInTheDocument();
      expect(screen.queryByText('Login response missing token')).not.toBeInTheDocument();
      expect(screen.queryByText('Invalid token format')).not.toBeInTheDocument();
      expect(screen.queryByText('An error occurred during login')).not.toBeInTheDocument();
    });

    it('should clear previous error on new submission attempt', async () => {
      // First submission fails
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'wrong@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });

      // Second submission succeeds
      const mockToken = createMockJWT({ role: 'user' });
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      fireEvent.change(emailInput, { target: { value: 'correct@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'correctpass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('LocalStorage Token Persistence', () => {
    it('should store token in localStorage on successful login', async () => {
      const mockToken = createMockJWT({ role: 'user' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('token', mockToken);
      });
    });

    it('should not store token when login fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should not store token when response is missing token', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'No token' }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Login response missing token')).toBeInTheDocument();
      });

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should not store token when token format is invalid', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'invalid-token' }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid token format')).toBeInTheDocument();
      });

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should dispatch auth-change event after storing token', async () => {
      const mockToken = createMockJWT({ role: 'user' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(window.dispatchEvent).toHaveBeenCalled();
        const dispatchedEvent = (window.dispatchEvent as jest.Mock).mock.calls[0][0];
        expect(dispatchedEvent.type).toBe('auth-change');
      });
    });

    it('should store token before dispatching auth-change event', async () => {
      const mockToken = createMockJWT({ role: 'user' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      const callOrder: string[] = [];
      (localStorage.setItem as jest.Mock).mockImplementation(() => {
        callOrder.push('setItem');
      });
      (window.dispatchEvent as jest.Mock).mockImplementation(() => {
        callOrder.push('dispatchEvent');
        return true;
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(callOrder).toEqual(['setItem', 'dispatchEvent']);
      });
    });
  });

  describe('Theme Integration', () => {
    it('should render correctly with light theme', () => {
      const lightTheme = createTheme({ palette: { mode: 'light' } });

      render(
        <ThemeProvider theme={lightTheme}>
          <LoginWindow />
        </ThemeProvider>
      );

      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    });

    it('should render correctly with dark theme', () => {
      const darkTheme = createTheme({ palette: { mode: 'dark' } });

      render(
        <ThemeProvider theme={darkTheme}>
          <LoginWindow />
        </ThemeProvider>
      );

      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible email input with label', () => {
      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(emailInput).toHaveAttribute('name', 'email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });

    it('should have accessible password input with label', () => {
      renderLoginWindow();

      const passwordInput = document.getElementById('password') as HTMLInputElement;
      expect(passwordInput).toHaveAttribute('id', 'password');
      expect(passwordInput).toHaveAttribute('name', 'password');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should have submit button with correct type', () => {
      renderLoginWindow();

      const loginButton = screen.getByRole('button', { name: /^login$/i });
      expect(loginButton).toHaveAttribute('type', 'submit');
    });

    it('should mark inputs as required', () => {
      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;

      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('required');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty form submission', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });

      renderLoginWindow();

      const loginButton = screen.getByRole('button', { name: /^login$/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should handle whitespace-only input', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: '   ' } });
      fireEvent.change(passwordInput, { target: { value: '   ' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({
              email: '   ',
              password: '   ',
            }),
          })
        );
      });
    });

    it('should handle very long email input', () => {
      const longEmail = 'a'.repeat(100) + '@' + 'b'.repeat(100) + '.com';

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: longEmail } });

      expect(emailInput.value).toBe(longEmail);
    });

    it('should handle very long password input', () => {
      const longPassword = 'p'.repeat(1000);

      renderLoginWindow();

      const passwordInput = document.getElementById('password') as HTMLInputElement as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: longPassword } });

      expect(passwordInput.value).toBe(longPassword);
    });

    it('should handle unicode characters in inputs', () => {
      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const passwordInput = document.getElementById('password') as HTMLInputElement as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'user@example.jp' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(emailInput.value).toBe('user@example.jp');
      expect(passwordInput.value).toBe('password123');
    });

    it('should handle rapid consecutive submissions', async () => {
      const mockToken = createMockJWT({ role: 'user' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });

      // Rapid clicks
      fireEvent.click(loginButton);
      fireEvent.click(loginButton);
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should handle token with additional payload fields', async () => {
      const mockToken = createMockJWT({
        role: 'admin',
        email: 'admin@test.com',
        iat: 1234567890,
        exp: 1234567890 + 3600,
        sub: 'user-id-123',
        permissions: ['read', 'write', 'delete'],
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'admin@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'adminpass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin');
      });
    });

    it('should handle token with empty payload', async () => {
      const mockToken = createMockJWT({});

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      renderLoginWindow();

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      const loginButton = screen.getByRole('button', { name: /^login$/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        // With no role, should redirect to home
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });
  });
});
