import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid API key configured successfully');
    } else {
      this.logger.warn('SendGrid API key not found in environment variables');
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    try {
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:8080';
      const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;
      const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

      if (!fromEmail) {
        throw new Error('SENDGRID_FROM_EMAIL not configured');
      }

      const msg = {
        to: email,
        from: fromEmail,
        subject: 'Password Reset Request - NSC Events',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2074d4; margin-bottom: 10px;">NSC Events</h1>
              <h2 style="color: #333; font-weight: normal;">Password Reset Request</h2>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #333; line-height: 1.6;">
                We received a request to reset the password for your NSC Events account.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="
                background: #2074d4; 
                color: white; 
                padding: 14px 28px; 
                text-decoration: none; 
                border-radius: 6px;
                display: inline-block;
                font-weight: bold;
                font-size: 16px;
              ">Reset Your Password</a>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Security Notice:</strong> This link will expire in 1 hour for your security.
              </p>
            </div>
            
            <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6c757d; font-size: 14px; line-height: 1.5;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="word-break: break-all; color: #2074d4; font-size: 14px; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                ${resetUrl}
              </p>
            </div>
            
            <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 20px; text-align: center;">
              <p style="color: #6c757d; font-size: 12px; margin: 0;">
                If you didn't request this password reset, please ignore this email.<br>
                Your account remains secure and no changes have been made.
              </p>
            </div>
          </div>
        `,
        text: `
          NSC Events - Password Reset Request
          
          We received a request to reset the password for your NSC Events account.
          
          Click the link below to reset your password:
          ${resetUrl}
          
          This link will expire in 1 hour.
          
          If you didn't request this password reset, please ignore this email.
        `,
      };

      await sgMail.send(msg);
      this.logger.log(`Password reset email sent successfully to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}:`,
        error,
      );
      throw new Error('Failed to send password reset email');
    }
  }
}
