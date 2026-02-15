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

  it('timed() measures duration', () => {
    const done = logger.timed('test-op');
    done();
    expect(console.log).toHaveBeenCalledTimes(1);
    const logged = JSON.parse((console.log as jest.Mock).mock.calls[0][0]);
    expect(logged.message).toBe('test-op completed');
    expect(typeof logged.durationMs).toBe('number');
  });
});
