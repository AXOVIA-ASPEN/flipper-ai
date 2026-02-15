import { logger } from '@/lib/logger';

describe('logger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs info as structured JSON', () => {
    logger.info('test message', { userId: '123' });
    expect(console.log).toHaveBeenCalledTimes(1);
    const logged = JSON.parse((console.log as jest.Mock).mock.calls[0][0]);
    expect(logged.level).toBe('info');
    expect(logged.message).toBe('test message');
    expect(logged.service).toBe('flipper-ai');
    expect(logged.userId).toBe('123');
    expect(logged.timestamp).toBeDefined();
  });

  it('logs errors to console.error', () => {
    logger.error('bad thing');
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('logs warnings to console.warn', () => {
    logger.warn('heads up');
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('logs fatal to console.error', () => {
    logger.fatal('system crash', { code: 'FATAL_001' });
    expect(console.error).toHaveBeenCalledTimes(1);
    const logged = JSON.parse((console.error as jest.Mock).mock.calls[0][0]);
    expect(logged.level).toBe('fatal');
    expect(logged.message).toBe('system crash');
    expect(logged.code).toBe('FATAL_001');
  });

  it('logs debug to console.log', () => {
    logger.debug('verbose detail', { step: 3 });
    // In test env (NODE_ENV=test), currentLevel defaults to 'debug'
    expect(console.log).toHaveBeenCalled();
    const logged = JSON.parse((console.log as jest.Mock).mock.calls[0][0]);
    expect(logged.level).toBe('debug');
    expect(logged.message).toBe('verbose detail');
    expect(logged.step).toBe(3);
  });

  it('timed() measures duration', () => {
    const done = logger.timed('test-op');
    done();
    expect(console.log).toHaveBeenCalledTimes(1);
    const logged = JSON.parse((console.log as jest.Mock).mock.calls[0][0]);
    expect(logged.message).toBe('test-op completed');
    expect(typeof logged.durationMs).toBe('number');
  });
});
