/**
 * Hito 11 Fase 2: Error Tracking Middleware
 * 
 * Captura y reporta errores para monitoreo
 * Preparado para integración con Sentry/similar
 */

import { logger, type LogContext } from '../utils/logger';

// ============================================================================
// Error Types
// ============================================================================

export interface TrackedError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  context?: LogContext;
  fingerprint?: string[];
}

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

interface ErrorReport {
  timestamp: string;
  severity: ErrorSeverity;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: LogContext;
  fingerprint?: string[];
  environment: string;
  release?: string;
}

// ============================================================================
// Error Tracker Class
// ============================================================================

class ErrorTracker {
  private static instance: ErrorTracker;
  private errorBuffer: ErrorReport[] = [];
  private readonly maxBufferSize = 100;
  private readonly flushInterval = 30000; // 30 seconds
  private intervalId?: NodeJS.Timeout;

  private constructor() {
    // Start periodic flush in production
    if (process.env.NODE_ENV === 'production') {
      this.intervalId = setInterval(() => this.flush(), this.flushInterval);
    }
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * Capture an error for tracking
   */
  capture(
    error: Error | TrackedError,
    severity: ErrorSeverity = 'error',
    context?: LogContext
  ): void {
    const trackedError = error as TrackedError;
    
    const report: ErrorReport = {
      timestamp: new Date().toISOString(),
      severity,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: { ...trackedError.context, ...context },
      fingerprint: trackedError.fingerprint,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version,
    };

    // Log the error
    if (severity === 'fatal' || severity === 'error') {
      logger.error(`[${severity.toUpperCase()}] ${error.message}`, error, context);
    } else {
      logger.warn(`[${severity.toUpperCase()}] ${error.message}`, context);
    }

    // Buffer for batch sending
    this.errorBuffer.push(report);

    // Flush if buffer is full or fatal error
    if (this.errorBuffer.length >= this.maxBufferSize || severity === 'fatal') {
      this.flush();
    }
  }

  /**
   * Capture a message (non-error event)
   */
  captureMessage(message: string, severity: ErrorSeverity = 'info', context?: LogContext): void {
    const report: ErrorReport = {
      timestamp: new Date().toISOString(),
      severity,
      error: {
        name: 'Message',
        message,
      },
      context,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version,
    };

    logger.info(`[${severity.toUpperCase()}] ${message}`, context);
    this.errorBuffer.push(report);
  }

  /**
   * Flush error buffer to external service
   */
  async flush(): Promise<void> {
    if (this.errorBuffer.length === 0) return;

    const errors = [...this.errorBuffer];
    this.errorBuffer = [];

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production' && process.env.ERROR_TRACKING_URL) {
      try {
        await fetch(process.env.ERROR_TRACKING_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ errors }),
        });
      } catch (err) {
        // Log locally if external service fails
        logger.error('Failed to send errors to tracking service', err as Error);
        // Re-add errors to buffer for retry
        this.errorBuffer.push(...errors.slice(0, this.maxBufferSize - this.errorBuffer.length));
      }
    } else {
      // In development, just log summary
      logger.debug(`Flushed ${errors.length} errors from buffer`);
    }
  }

  /**
   * Get recent errors (for debugging)
   */
  getRecentErrors(): ErrorReport[] {
    return [...this.errorBuffer];
  }

  /**
   * Shutdown tracker gracefully
   */
  async shutdown(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    await this.flush();
  }
}

// ============================================================================
// Exports
// ============================================================================

export const errorTracker = ErrorTracker.getInstance();

/**
 * Create a tracked error with context
 */
export function createTrackedError(
  message: string,
  statusCode: number = 500,
  code?: string,
  context?: LogContext
): TrackedError {
  const error = new Error(message) as TrackedError;
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  error.context = context;
  return error;
}

/**
 * Check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: Error | TrackedError): boolean {
  return (error as TrackedError).isOperational === true;
}

/**
 * Process shutdown handler
 */
export async function gracefulShutdown(): Promise<void> {
  logger.info('Graceful shutdown initiated');
  await errorTracker.shutdown();
  logger.info('Error tracker flushed');
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  errorTracker.capture(error, 'fatal', { type: 'uncaughtException' });
  logger.error('Uncaught exception - shutting down', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  errorTracker.capture(error, 'error', { type: 'unhandledRejection' });
});

// Handle shutdown signals
process.on('SIGTERM', async () => {
  await gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await gracefulShutdown();
  process.exit(0);
});
