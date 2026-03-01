/**
 * Structured JSON Logger for Flipper AI
 * Uses pino for native JSON structured logging with Cloud Logging compatibility.
 */
import pino from 'pino';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const isProduction = process.env.NODE_ENV === 'production';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  messageKey: 'message',
  formatters: {
    level(label) {
      return { severity: label.toUpperCase() };
    },
  },
  base: { service: 'flipper-ai' },
  ...((!isProduction && process.env.NODE_ENV !== 'test') && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
});

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => pinoLogger.debug(meta ?? {}, msg),
  info: (msg: string, meta?: Record<string, unknown>) => pinoLogger.info(meta ?? {}, msg),
  warn: (msg: string, meta?: Record<string, unknown>) => pinoLogger.warn(meta ?? {}, msg),
  error: (msg: string, meta?: Record<string, unknown>) => pinoLogger.error(meta ?? {}, msg),
  fatal: (msg: string, meta?: Record<string, unknown>) => pinoLogger.fatal(meta ?? {}, msg),

  /** Log with timing — returns a function to call when done */
  timed(operation: string, meta?: Record<string, unknown>): () => void {
    const start = performance.now();
    return () => {
      const durationMs = Math.round(performance.now() - start);
      pinoLogger.info({ ...meta, durationMs }, `${operation} completed`);
    };
  },

  /** Create a child logger with bound context (e.g., requestId) */
  child: (bindings: Record<string, unknown>) => pinoLogger.child(bindings),
};

export default logger;
