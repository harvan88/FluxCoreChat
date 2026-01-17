/**
 * Hito 11 Fase 2: Logger Implementation
 * Production-ready structured logging
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  accountId?: string;
  conversationId?: string;
  extensionId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ============================================================================
// Logger Class
// ============================================================================

class Logger {
  private context: LogContext = {};
  private minLevel: LogLevel;
  private service: string;

  constructor(service: string = 'fluxcore-api', minLevel?: LogLevel) {
    this.service = service;
    this.minLevel = minLevel ?? this.getMinLevelFromEnv();
  }

  private getMinLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  generateRequestId(): string {
    return randomUUID();
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private levelToString(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.ERROR: return 'ERROR';
      default: return 'INFO';
    }
  }

  private write(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: this.levelToString(level),
      message,
      service: this.service,
    };

    const mergedContext = { ...this.context, ...context };
    if (Object.keys(mergedContext).length > 0) {
      entry.context = mergedContext;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Production: JSON structured logs
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry));
    } else {
      // Development: Human readable
      const levelStr = entry.level.padEnd(5);
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const errorStr = entry.error ? `\n  Error: ${entry.error.message}` : '';
      console.log(`[${entry.timestamp}] ${levelStr} ${message}${contextStr}${errorStr}`);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.write(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.write(LogLevel.ERROR, message, context, error);
  }

  /**
   * Measure operation duration
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const start = Date.now();
    this.debug(`Starting: ${operation}`, context);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`Completed: ${operation}`, { ...context, duration });
      return result;
    } catch (err) {
      const duration = Date.now() - start;
      this.error(`Failed: ${operation}`, err as Error, { ...context, duration });
      throw err;
    }
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    const child = new Logger(this.service, this.minLevel);
    child.setContext({ ...this.context, ...context });
    return child;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const logger = new Logger('fluxcore-api');

// ============================================================================
// Request Logging Middleware for Elysia
// ============================================================================

export function createRequestLogger() {
  return {
    beforeHandle: ({ request }: { request: Request }) => {
      const requestId = logger.generateRequestId();
      const start = Date.now();
      
      // Store for later use
      (request as any).requestId = requestId;
      (request as any).startTime = start;

      const url = new URL(request.url);
      logger.info('Request started', {
        requestId,
        method: request.method,
        path: url.pathname,
      });
    },
    afterHandle: ({ request, response }: { request: Request; response: any }) => {
      const requestId = (request as any).requestId;
      const startTime = (request as any).startTime;
      const duration = Date.now() - startTime;
      const url = new URL(request.url);

      logger.info('Request completed', {
        requestId,
        method: request.method,
        path: url.pathname,
        duration,
      });

      return response;
    },
    onError: ({ request, error }: { request: Request; error: Error }) => {
      const requestId = (request as any).requestId;
      const startTime = (request as any).startTime;
      const duration = Date.now() - startTime;
      const url = new URL(request.url);

      logger.error('Request failed', error, {
        requestId,
        method: request.method,
        path: url.pathname,
        duration,
      });
    },
  };
}

// ============================================================================
// Error Handler
// ============================================================================

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export function createAppError(
  message: string,
  statusCode: number = 500,
  code?: string
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
}

export function handleError(error: Error | AppError, context?: LogContext): void {
  const appError = error as AppError;
  
  if (appError.isOperational) {
    logger.warn(`Operational error: ${error.message}`, {
      ...context,
      code: appError.code,
      statusCode: appError.statusCode,
    });
  } else {
    logger.error('Unexpected error', error, context);
    
    // In production, you would send to error tracking service here
    // e.g., Sentry.captureException(error);
  }
}
