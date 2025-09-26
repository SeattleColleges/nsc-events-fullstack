import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { sanitizeForLogging, sanitizeString } from '../utils/logging-sanitizer';

/**
 * Enhanced Winston logger with PII sanitization
 * This logger will sanitize all PII before logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    // Sanitize the message using our central sanitization utilities
    let sanitizedMessage: string;

    if (typeof message === 'string') {
      // Use the sanitizeString utility for string messages
      sanitizedMessage = sanitizeString(message);
    } else if (typeof message === 'object' && message !== null) {
      // For object messages, use our full sanitizer
      try {
        sanitizedMessage = JSON.stringify(sanitizeForLogging(message));
      } catch (e) {
        sanitizedMessage = String(message);
      }
    } else {
      // For any other type, convert to string
      sanitizedMessage = String(message);
    }

    // Sanitize the meta object to remove PII
    const sanitizedMeta = sanitizeForLogging(meta);
    const metaString = Object.keys(sanitizedMeta).length
      ? JSON.stringify(sanitizedMeta)
      : '';

    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${sanitizedMessage}\n${stack}${
        metaString ? '\nMeta: ' + metaString : ''
      }`;
    }

    return `${timestamp} [${level.toUpperCase()}]: ${sanitizedMessage}${
      metaString ? '\nMeta: ' + metaString : ''
    }`;
  }),
);

const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

export const WinstonLoggerModule = WinstonModule.forRoot({
  instance: winstonLogger,
});

export { winstonLogger };
