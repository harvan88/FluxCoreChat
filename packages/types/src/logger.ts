/**
 * Hito 11 Fase 2: Sistema de Logging Estructurado
 * 
 * Logger production-ready con:
 * - Niveles de log (debug, info, warn, error)
 * - Contexto estructurado
 * - Timestamps automáticos
 * - Correlación de requests
 * - Output JSON para producción
 */

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

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): ILogger;
}
