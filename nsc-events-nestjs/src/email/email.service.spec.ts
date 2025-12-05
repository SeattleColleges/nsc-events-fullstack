import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import { EmailService } from './email.service';

// Mock SendGrid module
jest.mock('@sendgrid/mail');

describe('EmailService', () => {
  let service: EmailService;
  let module: TestingModule;
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockSendGridApiKey = 'SG.test_api_key_12345';
  const mockFromEmail = 'noreply@nscevents.com';
  const mockFrontendUrl = 'https://nscevents.com';
  const mockResetToken = 'test-reset-token-abc123';
  const mockUserEmail = 'user@example.com';

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    (sgMail.setApiKey as jest.Mock).mockClear();
    (sgMail.send as jest.Mock).mockClear();

    // Spy on logger methods
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (module) {
      await module.close();
    }
  });

  describe('Constructor and Initialization', () => {
    it('should be defined', async () => {
      mockConfigService.get.mockReturnValue(mockSendGridApiKey);
      module = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();
      service = module.get<EmailService>(EmailService);
      expect(service).toBeDefined();
    });

    it('should configure SendGrid API key when provided', async () => {
      mockConfigService.get.mockReturnValue(mockSendGridApiKey);
      module = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();
      service = module.get<EmailService>(EmailService);

      expect(mockConfigService.get).toHaveBeenCalledWith('SENDGRID_API_KEY');
      expect(sgMail.setApiKey).toHaveBeenCalledWith(mockSendGridApiKey);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        'SendGrid API key configured successfully',
      );
    });

    it('should log warning when SendGrid API key is not found', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      module = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();
      service = module.get<EmailService>(EmailService);

      expect(mockConfigService.get).toHaveBeenCalledWith('SENDGRID_API_KEY');
      expect(sgMail.setApiKey).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'SendGrid API key not found in environment variables',
      );
    });

    it('should log warning when SendGrid API key is null', async () => {
      mockConfigService.get.mockReturnValue(null);
      module = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();
      service = module.get<EmailService>(EmailService);

      expect(sgMail.setApiKey).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'SendGrid API key not found in environment variables',
      );
    });

    it('should log warning when SendGrid API key is empty string', async () => {
      mockConfigService.get.mockReturnValue('');
      module = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();
      service = module.get<EmailService>(EmailService);

      expect(sgMail.setApiKey).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'SendGrid API key not found in environment variables',
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    beforeEach(async () => {
      // Initialize service with API key for email sending tests
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENDGRID_API_KEY') return mockSendGridApiKey;
        if (key === 'SENDGRID_FROM_EMAIL') return mockFromEmail;
        if (key === 'FRONTEND_URL') return mockFrontendUrl;
        return undefined;
      });
      module = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();
      service = module.get<EmailService>(EmailService);
      jest.clearAllMocks(); // Clear constructor calls
    });

    it('should send password reset email successfully with all config values', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      await service.sendPasswordResetEmail(mockUserEmail, mockResetToken);

      expect(mockConfigService.get).toHaveBeenCalledWith('FRONTEND_URL');
      expect(mockConfigService.get).toHaveBeenCalledWith('SENDGRID_FROM_EMAIL');
      expect(sgMail.send).toHaveBeenCalledTimes(1);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      expect(emailMessage.to).toBe(mockUserEmail);
      expect(emailMessage.from).toBe(mockFromEmail);
      expect(emailMessage.subject).toBe('Password Reset Request - NSC Events');
      expect(emailMessage.html).toContain('NSC Events');
      expect(emailMessage.html).toContain('Password Reset Request');
      expect(emailMessage.html).toContain(
        `${mockFrontendUrl}/auth/reset-password?token=${mockResetToken}`,
      );
      expect(emailMessage.text).toContain(
        'NSC Events - Password Reset Request',
      );
      expect(emailMessage.text).toContain(
        `${mockFrontendUrl}/auth/reset-password?token=${mockResetToken}`,
      );

      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Password reset email sent successfully to: ${mockUserEmail}`,
      );
    });

    it('should use default frontend URL when FRONTEND_URL is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENDGRID_API_KEY') return mockSendGridApiKey;
        if (key === 'SENDGRID_FROM_EMAIL') return mockFromEmail;
        if (key === 'FRONTEND_URL') return undefined;
        return undefined;
      });

      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      await service.sendPasswordResetEmail(mockUserEmail, mockResetToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      const expectedDefaultUrl = 'http://localhost:8080';
      expect(emailMessage.html).toContain(
        `${expectedDefaultUrl}/auth/reset-password?token=${mockResetToken}`,
      );
      expect(emailMessage.text).toContain(
        `${expectedDefaultUrl}/auth/reset-password?token=${mockResetToken}`,
      );
    });

    it('should use default frontend URL when FRONTEND_URL is empty string', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENDGRID_API_KEY') return mockSendGridApiKey;
        if (key === 'SENDGRID_FROM_EMAIL') return mockFromEmail;
        if (key === 'FRONTEND_URL') return '';
        return undefined;
      });

      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      await service.sendPasswordResetEmail(mockUserEmail, mockResetToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      const expectedDefaultUrl = 'http://localhost:8080';
      expect(emailMessage.html).toContain(
        `${expectedDefaultUrl}/auth/reset-password?token=${mockResetToken}`,
      );
    });

    it('should throw error when SENDGRID_FROM_EMAIL is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENDGRID_API_KEY') return mockSendGridApiKey;
        if (key === 'SENDGRID_FROM_EMAIL') return undefined;
        if (key === 'FRONTEND_URL') return mockFrontendUrl;
        return undefined;
      });

      await expect(
        service.sendPasswordResetEmail(mockUserEmail, mockResetToken),
      ).rejects.toThrow('Failed to send password reset email');

      expect(sgMail.send).not.toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Failed to send password reset email to ${mockUserEmail}:`,
        expect.any(Error),
      );
    });

    it('should throw error when SENDGRID_FROM_EMAIL is null', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENDGRID_API_KEY') return mockSendGridApiKey;
        if (key === 'SENDGRID_FROM_EMAIL') return null;
        if (key === 'FRONTEND_URL') return mockFrontendUrl;
        return undefined;
      });

      await expect(
        service.sendPasswordResetEmail(mockUserEmail, mockResetToken),
      ).rejects.toThrow('Failed to send password reset email');

      expect(sgMail.send).not.toHaveBeenCalled();
    });

    it('should throw error when SENDGRID_FROM_EMAIL is empty string', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENDGRID_API_KEY') return mockSendGridApiKey;
        if (key === 'SENDGRID_FROM_EMAIL') return '';
        if (key === 'FRONTEND_URL') return mockFrontendUrl;
        return undefined;
      });

      await expect(
        service.sendPasswordResetEmail(mockUserEmail, mockResetToken),
      ).rejects.toThrow('Failed to send password reset email');

      expect(sgMail.send).not.toHaveBeenCalled();
    });

    it('should construct correct reset URL with token parameter', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      const customToken = 'custom-token-xyz789';
      await service.sendPasswordResetEmail(mockUserEmail, customToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      expect(emailMessage.html).toContain(
        `${mockFrontendUrl}/auth/reset-password?token=${customToken}`,
      );
      expect(emailMessage.text).toContain(
        `${mockFrontendUrl}/auth/reset-password?token=${customToken}`,
      );
    });

    it('should include all required email template elements in HTML', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      await service.sendPasswordResetEmail(mockUserEmail, mockResetToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      const htmlContent = emailMessage.html;

      // Check for required content elements
      expect(htmlContent).toContain('NSC Events');
      expect(htmlContent).toContain('Password Reset Request');
      expect(htmlContent).toContain(
        'We received a request to reset the password for your NSC Events account',
      );
      expect(htmlContent).toContain('Reset Your Password');
      expect(htmlContent).toContain('This link will expire in 1 hour');
      expect(htmlContent).toContain(
        "If you didn't request this password reset, please ignore this email",
      );

      // Check for styling elements
      expect(htmlContent).toContain('font-family: Arial, sans-serif');
      expect(htmlContent).toContain('max-width: 600px');

      // Check for reset URL in button and fallback
      const resetUrl = `${mockFrontendUrl}/auth/reset-password?token=${mockResetToken}`;
      expect(htmlContent).toContain(`href="${resetUrl}"`);
      expect(htmlContent).toContain(resetUrl); // Should appear at least twice
    });

    it('should include all required email template elements in plain text', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      await service.sendPasswordResetEmail(mockUserEmail, mockResetToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      const textContent = emailMessage.text;

      expect(textContent).toContain('NSC Events - Password Reset Request');
      expect(textContent).toContain(
        'We received a request to reset the password for your NSC Events account',
      );
      expect(textContent).toContain(
        'Click the link below to reset your password',
      );
      expect(textContent).toContain(
        `${mockFrontendUrl}/auth/reset-password?token=${mockResetToken}`,
      );
      expect(textContent).toContain('This link will expire in 1 hour');
      expect(textContent).toContain(
        "If you didn't request this password reset, please ignore this email",
      );
    });

    it('should handle SendGrid API errors and log them', async () => {
      const sendGridError = new Error(
        'SendGrid API error: Rate limit exceeded',
      );
      (sgMail.send as jest.Mock).mockRejectedValue(sendGridError);

      await expect(
        service.sendPasswordResetEmail(mockUserEmail, mockResetToken),
      ).rejects.toThrow('Failed to send password reset email');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Failed to send password reset email to ${mockUserEmail}:`,
        sendGridError,
      );
    });

    it('should handle network errors when sending email', async () => {
      const networkError = new Error('Network error: ECONNREFUSED');
      (sgMail.send as jest.Mock).mockRejectedValue(networkError);

      await expect(
        service.sendPasswordResetEmail(mockUserEmail, mockResetToken),
      ).rejects.toThrow('Failed to send password reset email');

      expect(sgMail.send).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Failed to send password reset email to ${mockUserEmail}:`,
        networkError,
      );
    });

    it('should handle SendGrid authentication errors', async () => {
      const authError = new Error('Unauthorized: Invalid API key');
      (sgMail.send as jest.Mock).mockRejectedValue(authError);

      await expect(
        service.sendPasswordResetEmail(mockUserEmail, mockResetToken),
      ).rejects.toThrow('Failed to send password reset email');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        `Failed to send password reset email to ${mockUserEmail}:`,
        authError,
      );
    });

    it('should handle special characters in email address', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      const specialEmail = 'user+test@example.co.uk';
      await service.sendPasswordResetEmail(specialEmail, mockResetToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      expect(emailMessage.to).toBe(specialEmail);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        `Password reset email sent successfully to: ${specialEmail}`,
      );
    });

    it('should handle special characters in reset token', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      const specialToken = 'token-with-special_chars.123/abc';
      await service.sendPasswordResetEmail(mockUserEmail, specialToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      expect(emailMessage.html).toContain(
        `${mockFrontendUrl}/auth/reset-password?token=${specialToken}`,
      );
      expect(emailMessage.text).toContain(
        `${mockFrontendUrl}/auth/reset-password?token=${specialToken}`,
      );
    });

    it('should handle custom frontend URL with trailing slash', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENDGRID_API_KEY') return mockSendGridApiKey;
        if (key === 'SENDGRID_FROM_EMAIL') return mockFromEmail;
        if (key === 'FRONTEND_URL') return 'https://example.com/';
        return undefined;
      });

      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      await service.sendPasswordResetEmail(mockUserEmail, mockResetToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      // Should concatenate with /auth, resulting in double slash (this is current behavior)
      expect(emailMessage.html).toContain(
        `https://example.com//auth/reset-password?token=${mockResetToken}`,
      );
    });

    it('should verify email message structure matches SendGrid requirements', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      await service.sendPasswordResetEmail(mockUserEmail, mockResetToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];

      // Verify all required SendGrid fields are present
      expect(emailMessage).toHaveProperty('to');
      expect(emailMessage).toHaveProperty('from');
      expect(emailMessage).toHaveProperty('subject');
      expect(emailMessage).toHaveProperty('html');
      expect(emailMessage).toHaveProperty('text');

      // Verify field types
      expect(typeof emailMessage.to).toBe('string');
      expect(typeof emailMessage.from).toBe('string');
      expect(typeof emailMessage.subject).toBe('string');
      expect(typeof emailMessage.html).toBe('string');
      expect(typeof emailMessage.text).toBe('string');

      // Verify non-empty content
      expect(emailMessage.to.length).toBeGreaterThan(0);
      expect(emailMessage.from.length).toBeGreaterThan(0);
      expect(emailMessage.subject.length).toBeGreaterThan(0);
      expect(emailMessage.html.length).toBeGreaterThan(0);
      expect(emailMessage.text.length).toBeGreaterThan(0);
    });

    it('should not expose internal error details to caller', async () => {
      const internalError = new Error(
        'Internal SendGrid error with sensitive data: API_KEY=secret123',
      );
      (sgMail.send as jest.Mock).mockRejectedValue(internalError);

      await expect(
        service.sendPasswordResetEmail(mockUserEmail, mockResetToken),
      ).rejects.toThrow('Failed to send password reset email');

      // Verify the error message is generic and doesn't expose internal details
      try {
        await service.sendPasswordResetEmail(mockUserEmail, mockResetToken);
      } catch (error) {
        expect(error.message).toBe('Failed to send password reset email');
        expect(error.message).not.toContain('API_KEY');
        expect(error.message).not.toContain('secret123');
      }
    });

    it('should call SendGrid send method exactly once per email', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      await service.sendPasswordResetEmail(mockUserEmail, mockResetToken);

      expect(sgMail.send).toHaveBeenCalledTimes(1);
    });

    it('should handle long email addresses', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      const longEmail =
        'very.long.email.address.with.many.dots@subdomain.example.com';
      await service.sendPasswordResetEmail(longEmail, mockResetToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      expect(emailMessage.to).toBe(longEmail);
    });

    it('should handle long reset tokens', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      const longToken = 'a'.repeat(200);
      await service.sendPasswordResetEmail(mockUserEmail, longToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      expect(emailMessage.html).toContain(longToken);
      expect(emailMessage.text).toContain(longToken);
    });

    it('should handle different frontend URL schemes (http vs https)', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENDGRID_API_KEY') return mockSendGridApiKey;
        if (key === 'SENDGRID_FROM_EMAIL') return mockFromEmail;
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        return undefined;
      });

      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      await service.sendPasswordResetEmail(mockUserEmail, mockResetToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      expect(emailMessage.html).toContain(
        `http://localhost:3000/auth/reset-password?token=${mockResetToken}`,
      );
    });
  });

  describe('Edge Cases and Integration', () => {
    beforeEach(async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SENDGRID_API_KEY') return mockSendGridApiKey;
        if (key === 'SENDGRID_FROM_EMAIL') return mockFromEmail;
        if (key === 'FRONTEND_URL') return mockFrontendUrl;
        return undefined;
      });
      module = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();
      service = module.get<EmailService>(EmailService);
      jest.clearAllMocks();
    });

    it('should handle concurrent email sending requests', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      const promises = [
        service.sendPasswordResetEmail('user1@example.com', 'token1'),
        service.sendPasswordResetEmail('user2@example.com', 'token2'),
        service.sendPasswordResetEmail('user3@example.com', 'token3'),
      ];

      await Promise.all(promises);

      expect(sgMail.send).toHaveBeenCalledTimes(3);
      expect(loggerLogSpy).toHaveBeenCalledTimes(3);
    });

    it('should maintain separate error contexts for concurrent requests', async () => {
      let callCount = 0;
      (sgMail.send as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Failed for user2'));
        }
        return Promise.resolve([{ statusCode: 202, body: {}, headers: {} }]);
      });

      const results = await Promise.allSettled([
        service.sendPasswordResetEmail('user1@example.com', 'token1'),
        service.sendPasswordResetEmail('user2@example.com', 'token2'),
        service.sendPasswordResetEmail('user3@example.com', 'token3'),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to send password reset email to user2@example.com:',
        expect.any(Error),
      );
    });

    it('should handle empty string email gracefully', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      await service.sendPasswordResetEmail('', mockResetToken);

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      expect(emailMessage.to).toBe('');
    });

    it('should handle empty string token gracefully', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, body: {}, headers: {} },
      ]);

      await service.sendPasswordResetEmail(mockUserEmail, '');

      const emailMessage = (sgMail.send as jest.Mock).mock.calls[0][0];
      expect(emailMessage.html).toContain(
        `${mockFrontendUrl}/auth/reset-password?token=`,
      );
      expect(emailMessage.text).toContain(
        `${mockFrontendUrl}/auth/reset-password?token=`,
      );
    });
  });
});
