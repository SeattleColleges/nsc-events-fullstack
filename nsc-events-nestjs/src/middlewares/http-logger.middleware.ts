import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { sanitizeUrl } from '../utils/logging-sanitizer';

/**
 * Middleware for logging HTTP requests with sanitized data
 * Includes response status to show operation success/failure
 */
@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    // Get request start time for response time calculation
    const startTime = Date.now();

    // Store the original URL for logging before any modifications
    const originalUrl = req.originalUrl || req.url;
    const sanitizedUrl = sanitizeUrl(originalUrl);

    // Add a listener for when the response finishes
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      const statusText = statusCode < 400 ? 'SUCCESS' : 'FAILED';

      // Build a clean request log
      let requestLog = `${req.method} ${sanitizedUrl}`;

      // Special handling for auth endpoints with no PII
      if (sanitizedUrl.includes('/api/auth/')) {
        if (sanitizedUrl.includes('/signup')) {
          const role = req.body?.role || 'user';
          requestLog = `${req.method} ${sanitizedUrl} - New ${role} account creation ${statusText} [${statusCode}]`;
        } else if (sanitizedUrl.includes('/login')) {
          requestLog = `${req.method} ${sanitizedUrl} - Login ${statusText} [${statusCode}]`;
        } else if (sanitizedUrl.includes('/change-password')) {
          requestLog = `${req.method} ${sanitizedUrl} - Password change ${statusText} [${statusCode}]`;
        } else {
          requestLog = `${req.method} ${sanitizedUrl} - Auth operation ${statusText} [${statusCode}]`;
        }
      }
      // Non-auth endpoints with limited data exposure
      else if (
        req.method !== 'GET' &&
        req.body &&
        Object.keys(req.body).length > 0
      ) {
        // For write operations, just log the operation type without details
        if (
          sanitizedUrl.includes('/api/activity') ||
          sanitizedUrl.includes('/api/events')
        ) {
          requestLog += ` - Activity ${
            req.method === 'POST' ? 'creation' : 'modification'
          } ${statusText} [${statusCode}]`;
        } else if (sanitizedUrl.includes('/api/event-registration')) {
          requestLog += ` - Event registration ${statusText} [${statusCode}]`;
        } else if (sanitizedUrl.includes('/api/user')) {
          requestLog += ` - User profile update ${statusText} [${statusCode}]`;
        } else {
          requestLog += ` - Data operation ${statusText} [${statusCode}]`;
        }
      }
      // Query operations
      else if (req.method === 'GET') {
        if (sanitizedUrl.includes('/api/events')) {
          requestLog += ` - Events query ${statusText} [${statusCode}]`;
        } else if (sanitizedUrl.includes('/api/user')) {
          requestLog += ` - User profile query ${statusText} [${statusCode}]`;
        } else {
          requestLog += ` - Query ${statusText} [${statusCode}]`;
        }
      } else {
        requestLog += ` - ${statusText} [${statusCode}]`;
      }

      // Add response time
      requestLog += ` (${responseTime}ms)`;

      // Log with appropriate level based on status code
      if (statusCode >= 500) {
        this.logger.error(requestLog);
      } else if (statusCode >= 400) {
        this.logger.warn(requestLog);
      } else {
        this.logger.log(requestLog);
      }
    });

    // Continue processing the request
    next();
  }
}
