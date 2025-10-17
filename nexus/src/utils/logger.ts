/**
 * Structured Logging System
 * 
 * Provides comprehensive logging with rotation, correlation IDs,
 * and multiple output destinations.
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Log levels with priority
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

// Custom log colors
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  debug: 'green',
  trace: 'magenta',
};

// Add colors to winston
winston.addColors(LOG_COLORS);

interface LogContext {
  correlationId?: string;
  userId?: string;
  operation?: string;
  environment?: string;
  component?: string;
  [key: string]: unknown;
}

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  correlationId: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private winston: winston.Logger;
  private correlationId: string;
  private context: LogContext;

  constructor() {
    this.correlationId = uuidv4();
    this.context = {};
    
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create winston logger instance
    this.winston = winston.createLogger({
      levels: LOG_LEVELS,
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'nexus',
        version: process.env.npm_package_version || '1.0.0',
      },
      transports: [
        // Console output with colors
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, correlationId, context }) => {
              const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
              return `${timestamp} ${level}: ${message}${contextStr} (${correlationId})`;
            })
          ),
        }),
        
        // File output with rotation
        new winston.transports.File({
          filename: path.join(logsDir, 'nexus.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true,
        }),
        
        // Error-only file
        new winston.transports.File({
          filename: path.join(logsDir, 'nexus-error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 3,
          tailable: true,
        }),
      ],
      
      // Handle uncaught exceptions
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(logsDir, 'nexus-exceptions.log'),
        }),
      ],
      
      // Handle unhandled rejections
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(logsDir, 'nexus-rejections.log'),
        }),
      ],
    });
  }

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Generate new correlation ID
   */
  generateCorrelationId(): string {
    this.correlationId = uuidv4();
    return this.correlationId;
  }

  /**
   * Set context for all subsequent log messages
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.correlationId = this.correlationId;
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log trace message
   */
  trace(message: string, context?: LogContext): void {
    this.log('trace', message, context);
  }

  /**
   * Internal log method
   */
  private log(level: string, message: string, context?: LogContext, error?: Error): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      context: { ...this.context, ...context },
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.winston.log(level, message, {
      correlationId: this.correlationId,
      context: logEntry.context,
      error: logEntry.error,
    });
  }

  /**
   * Time operation execution
   */
  async time<T>(operation: string, fn: () => Promise<T>, context?: LogContext): Promise<T> {
    const startTime = Date.now();
    const operationId = uuidv4();
    
    this.info(`Starting operation: ${operation}`, { 
      ...context, 
      operationId, 
      operation 
    });

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.info(`Completed operation: ${operation}`, {
        ...context,
        operationId,
        operation,
        duration,
        result: 'success',
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.error(`Failed operation: ${operation}`, {
        ...context,
        operationId,
        operation,
        duration,
        result: 'failure',
      }, error as Error);
      
      throw error;
    }
  }

  /**
   * Create audit log entry
   */
  audit(action: string, context?: LogContext): void {
    this.info(`AUDIT: ${action}`, {
      ...context,
      auditLog: true,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log performance metrics
   */
  metrics(name: string, value: number, unit: string, context?: LogContext): void {
    this.info(`METRIC: ${name}`, {
      ...context,
      metric: {
        name,
        value,
        unit,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export Logger class for child loggers
export { Logger };

// Export types
export type { LogContext, LogEntry };