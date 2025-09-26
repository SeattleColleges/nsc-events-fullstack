/**
 * Utility functions for sanitizing sensitive data in logs
 * SECURITY: Prevents PII exposure in application logs
 *
 * This file contains all PII sanitization functionality:
 * 1. Sanitization utilities for different data types
 * 2. Console method overriding for global sanitization
 * 3. Request body sanitization for HTTP logging
 */

import { Logger } from '@nestjs/common';

// Store original console methods to restore later if needed
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

// Flag to prevent double initialization
let isInitialized = false;

/**
 * Initialize global console sanitization
 * This overrides all console methods to automatically sanitize PII
 */
export function initializeConsoleSanitization(): void {
  if (isInitialized) return;

  console.log = function (...args) {
    originalConsole.log.apply(
      console,
      args.map((arg) =>
        typeof arg === 'object' && arg !== null ? sanitizeForLogging(arg) : arg,
      ),
    );
  };

  console.info = function (...args) {
    originalConsole.info.apply(
      console,
      args.map((arg) =>
        typeof arg === 'object' && arg !== null ? sanitizeForLogging(arg) : arg,
      ),
    );
  };

  console.warn = function (...args) {
    originalConsole.warn.apply(
      console,
      args.map((arg) =>
        typeof arg === 'object' && arg !== null ? sanitizeForLogging(arg) : arg,
      ),
    );
  };

  console.error = function (...args) {
    originalConsole.error.apply(
      console,
      args.map((arg) =>
        typeof arg === 'object' && arg !== null ? sanitizeForLogging(arg) : arg,
      ),
    );
  };

  console.debug = function (...args) {
    originalConsole.debug.apply(
      console,
      args.map((arg) =>
        typeof arg === 'object' && arg !== null ? sanitizeForLogging(arg) : arg,
      ),
    );
  };

  isInitialized = true;
}

/**
 * Restore original console methods
 */
export function restoreConsole(): void {
  if (!isInitialized) return;

  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;

  isInitialized = false;
}

/**
 * Secure logger that sanitizes all messages
 */
export const secureLogger = {
  log: (message: any, context = 'Application'): void => {
    const logger = new Logger(context);
    logger.log(sanitizeMessage(message));
  },
  error: (message: any, trace?: string, context = 'Application'): void => {
    const logger = new Logger(context);
    logger.error(sanitizeMessage(message), trace);
  },
  warn: (message: any, context = 'Application'): void => {
    const logger = new Logger(context);
    logger.warn(sanitizeMessage(message));
  },
  debug: (message: any, context = 'Application'): void => {
    if (process.env.NODE_ENV !== 'production') {
      const logger = new Logger(context);
      logger.debug(sanitizeMessage(message));
    }
  },
  verbose: (message: any, context = 'Application'): void => {
    if (process.env.NODE_ENV !== 'production') {
      const logger = new Logger(context);
      logger.verbose(sanitizeMessage(message));
    }
  },
};

/**
 * Sanitizes message content for logging
 */
function sanitizeMessage(message: any): any {
  if (typeof message === 'string') {
    return sanitizeString(message);
  }
  return sanitizeForLogging(message);
}

/**
 * Sanitizes string content, masking any PII patterns
 */
export function sanitizeString(input: string): string {
  if (!input) return input;

  return (
    input
      // Mask emails in text
      .replace(/([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, (email) =>
        maskEmail(email),
      )
      // Mask potential tokens
      .replace(
        /(Bearer|JWT|token:|apikey:|api_key:)\s*([^\s"']+)/gi,
        '$1 [SECURED]',
      )
      // Mask SSNs (US)
      .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, 'XXX-XX-XXXX')
      // Mask phone numbers
      .replace(
        /\b(\+\d{1,3}[-\s]?)?(\d{3}|\(\d{3}\))[-\s]?\d{3}[-\s]?\d{4}\b/g,
        '[PHONE]',
      )
  );
}

export interface SanitizedUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  // Removed sensitive fields: password, resetPasswordToken, etc.
}

export interface SanitizedActivity {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  // Keep user info minimal
  createdByUserId?: string;
  updatedByUserId?: string;
}

export interface SanitizedEvent {
  id: string;
  title?: string;
  description?: string;
  location?: string;
  eventDate?: Date;
  // Keep user info minimal
  createdByUserId?: string;
  updatedByUserId?: string;
}

/**
 * Sanitizes user object for logging by removing sensitive fields
 */
export function sanitizeUserForLogging(user: any): SanitizedUser {
  if (!user) return null;

  return {
    id: user.id || (user._id ? user._id.toString() : undefined), // Handle legacy _id if present
    firstName: maskName(user.firstName),
    lastName: maskName(user.lastName),
    email: maskEmail(user.email),
    role: user.role,
  };
}

/**
 * Sanitizes activity object for logging by removing sensitive user data
 */
export function sanitizeActivityForLogging(activity: any): SanitizedActivity {
  if (!activity) return null;

  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    category: activity.category,
    location: activity.location,
    createdByUserId: activity.createdByUser?.id || activity.created_by_user_id,
    updatedByUserId: activity.updatedByUser?.id || activity.updated_by_user_id,
  };
}

/**
 * Sanitizes event object for logging by removing sensitive user data
 */
export function sanitizeEventForLogging(event: any): SanitizedEvent {
  if (!event) return null;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    eventDate: event.eventDate,
    createdByUserId: event.createdByUser?.id || event.created_by_user_id,
    updatedByUserId: event.updatedByUser?.id || event.updated_by_user_id,
  };
}

/**
 * Masks email address for logging (shows only first char and domain)
 */
export function maskEmail(email: string): string {
  if (!email) return '';

  const [localPart, domain] = email.split('@');
  if (!domain) return '***@***'; // Invalid email format

  const maskedLocal =
    localPart.charAt(0) + '*'.repeat(Math.max(2, localPart.length - 1));
  return `${maskedLocal}@${domain}`;
}

/**
 * Masks name for logging (shows only first character)
 */
export function maskName(name: string): string {
  if (!name || name.length === 0) return '';
  if (name.length === 1) return name;
  return name.charAt(0) + '*'.repeat(Math.max(2, name.length - 1));
}

/**
 * Generic function to remove sensitive fields from any object
 */
export function removeSensitiveFields(
  obj: any,
  sensitiveFields: string[] = [],
): any {
  if (!obj) return obj;

  const defaultSensitiveFields = [
    'password',
    'resetPasswordToken',
    'resetPasswordExpires',
    'googleCredentials',
    'googleId',
    'passwordHash',
    'salt',
    'authToken',
    'verificationToken',
    'currentPassword',
    'newPassword',
    'newPasswordConfirm',
    'confirmPassword',
    'secret',
    'apiKey',
    'authorization',
    'credit_card',
    'cardNumber',
    'cvv',
  ];

  const fieldsToRemove = [...defaultSensitiveFields, ...sensitiveFields];
  const sanitized = { ...obj };

  fieldsToRemove.forEach((field) => {
    delete sanitized[field];
  });

  return sanitized;
}

/**
 * Sanitizes request body for logging
 */
export function sanitizeRequestBody(body: any): any {
  if (!body) return body;

  // Deep clone to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(body));

  // Special handling for authentication requests
  if (sanitized.email) {
    sanitized.email = maskEmail(sanitized.email);
  }

  if (sanitized.firstName) {
    sanitized.firstName = maskName(sanitized.firstName);
  }

  if (sanitized.lastName) {
    sanitized.lastName = maskName(sanitized.lastName);
  }

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'token',
    'refreshToken',
    'currentPassword',
    'newPassword',
    'newPasswordConfirm',
    'confirmPassword',
    'secret',
    'apiKey',
    'authorization',
    'credit_card',
    'cardNumber',
    'cvv',
  ];

  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = '[secured]';
    }
  });

  return sanitized;
}

/**
 * Sanitize UUIDs for logging (shows first and last segments)
 */
export function maskUUID(uuid: string): string {
  if (!uuid || typeof uuid !== 'string') return uuid;

  // Check if it's a UUID format (basic check)
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      uuid,
    )
  ) {
    return uuid;
  }

  const parts = uuid.split('-');
  if (parts.length !== 5) return uuid;

  return `${parts[0].substring(
    0,
    4,
  )}****-****-****-****-******${parts[4].substring(6)}`;
}

/**
 * Sanitizes URL paths to mask sensitive IDs
 */
export function sanitizeUrl(url: string): string {
  if (!url) return url;

  // Mask UUIDs in URL paths
  return url.replace(
    /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi,
    (match, uuid) => `/${maskUUID(uuid)}`,
  );
}

/**
 * Sanitizes any object for safe logging
 */
export function sanitizeForLogging(data: any): any {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogging(item));
  }

  if (typeof data === 'object') {
    // If it looks like a user object
    if (data.email && (data.password || data.firstName)) {
      return sanitizeUserForLogging(data);
    }

    // If it looks like an activity object
    if (data.title && data.description) {
      return sanitizeActivityForLogging(data);
    }

    // If it looks like an event object
    if (data.eventDate) {
      return sanitizeEventForLogging(data);
    }

    // If it looks like a request body with authentication data
    if ((data.email && data.password) || data.token) {
      return sanitizeRequestBody(data);
    }

    // Sanitize UUID fields
    const sanitized = { ...data };

    // Handle common ID fields
    if (sanitized.id && typeof sanitized.id === 'string') {
      sanitized.id = maskUUID(sanitized.id);
    }

    if (sanitized.userId && typeof sanitized.userId === 'string') {
      sanitized.userId = maskUUID(sanitized.userId);
    }

    if (sanitized.user_id && typeof sanitized.user_id === 'string') {
      sanitized.user_id = maskUUID(sanitized.user_id);
    }

    // Generic object sanitization for other sensitive fields
    return removeSensitiveFields(sanitized);
  }

  return data;
}
