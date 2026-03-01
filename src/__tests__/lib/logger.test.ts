/**
 * Tests for pino-based structured logger
 */

// Mock pino before importing logger
const mockChild = jest.fn().mockReturnValue({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
});

const mockPinoInstance = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  child: mockChild,
};

jest.mock('pino', () => {
  const pinoFactory = jest.fn(() => mockPinoInstance);
  return { __esModule: true, default: pinoFactory };
});

import { logger } from '@/lib/logger';
import type { LogLevel } from '@/lib/logger';

describe('logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('log methods', () => {
    it('calls pinoLogger.info with correct argument order (meta first, message second)', () => {
      logger.info('test message', { key: 'value' });
      expect(mockPinoInstance.info).toHaveBeenCalledWith({ key: 'value' }, 'test message');
    });

    it('calls pinoLogger.debug with meta and message', () => {
      logger.debug('debug msg', { debug: true });
      expect(mockPinoInstance.debug).toHaveBeenCalledWith({ debug: true }, 'debug msg');
    });

    it('calls pinoLogger.warn with meta and message', () => {
      logger.warn('warn msg', { level: 'high' });
      expect(mockPinoInstance.warn).toHaveBeenCalledWith({ level: 'high' }, 'warn msg');
    });

    it('calls pinoLogger.error with meta and message', () => {
      logger.error('error msg', { code: 500 });
      expect(mockPinoInstance.error).toHaveBeenCalledWith({ code: 500 }, 'error msg');
    });

    it('calls pinoLogger.fatal with meta and message', () => {
      logger.fatal('fatal msg', { critical: true });
      expect(mockPinoInstance.fatal).toHaveBeenCalledWith({ critical: true }, 'fatal msg');
    });

    it('passes empty object when no meta provided', () => {
      logger.info('no meta');
      expect(mockPinoInstance.info).toHaveBeenCalledWith({}, 'no meta');
    });
  });

  describe('timed()', () => {
    it('returns a function that logs duration on completion', () => {
      const end = logger.timed('db-query', { table: 'users' });
      expect(typeof end).toBe('function');

      end();

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'users',
          durationMs: expect.any(Number),
        }),
        'db-query completed'
      );
    });

    it('works without meta', () => {
      const end = logger.timed('operation');
      end();

      expect(mockPinoInstance.info).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: expect.any(Number),
        }),
        'operation completed'
      );
    });
  });

  describe('child()', () => {
    it('creates a child logger with bound context', () => {
      const child = logger.child({ requestId: 'abc-123' });
      expect(mockChild).toHaveBeenCalledWith({ requestId: 'abc-123' });
      expect(child).toBeDefined();
    });
  });

  describe('LogLevel type', () => {
    it('exports LogLevel type (compile-time check)', () => {
      const level: LogLevel = 'info';
      expect(level).toBe('info');
    });
  });
});
