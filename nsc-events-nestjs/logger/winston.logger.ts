import { createLogger, format, transports } from "winston";
import { sanitizeForLogging, maskEmail, maskName } from "../src/utils/logging-sanitizer";

const customFormat = format.combine(
  format.colorize({
    message: true,
    colors: {
      info: "cyan",
      warn: "yellow",
      error: "red",
    },
  }),
  format.printf(({ timestamp, level, stack, context, message }) => {
    // Sanitize sensitive information in logs using our utility functions
    let sanitizedMessage: string;
    
    if (typeof message === 'string') {
      // Apply email masking
      sanitizedMessage = message.replace(/([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, 
        (email) => maskEmail(email));
      
      // Try to sanitize any JSON objects in the message string
      sanitizedMessage = sanitizedMessage.replace(/{.*}/g, (match) => {
        try {
          const obj = JSON.parse(match);
          return JSON.stringify(sanitizeForLogging(obj));
        } catch (e) {
          return match; // Not valid JSON
        }
      });
    } 
    else if (typeof message === 'object' && message !== null) {
      // For object messages, use our sanitizer
      try {
        sanitizedMessage = JSON.stringify(sanitizeForLogging(message));
      } catch (e) {
        // If stringify fails, use original message as string
        sanitizedMessage = String(message);
      }
    }
    else {
      // Handle non-string, non-object messages
      sanitizedMessage = String(message);
    }
    
    return `${timestamp} - [${level
      .toUpperCase()
      .padEnd(7)}] - ${sanitizedMessage}  -- (stack/context: ${stack || context})`;
  })
);

const options = {
  file: {
    filename: "error.log",
    level: "error",
  },
  console: {
    level: "silly",
    handleExceptions: true,
  },
};

const developmentLogger = {
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp(),
    customFormat
  ),
  level: "info", // Reduce verbosity even in development
  transports: [new transports.Console(options.console)],
};

const productionLogger = {
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp(),
    format.json()
  ),
  level: "warn", // Only log warnings and errors in production
  transports: [
    new transports.File(options.file),
    new transports.File({
      filename: "combine.log",
      level: "warn",
    }),
  ],
};

const instanceLogger =
  process.env.NODE_ENV === "production" ? productionLogger : developmentLogger;

export const instance = createLogger(instanceLogger);
