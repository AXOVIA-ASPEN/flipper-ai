import { captureError, getRecentErrors, clearErrors } from '@/lib/error-tracker';

describe('error-tracker', () => {
  beforeEach(() => {
    clearErrors();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('captures and stores errors', () => {
    captureError(new Error('test error'), { route: '/api/test' });
    const errors = getRecentErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('test error');
    expect(errors[0].context.route).toBe('/api/test');
  });

  it('limits stored errors', () => {
    for (let i = 0; i < 60; i++) {
      captureError(new Error(`error ${i}`));
    }
    expect(getRecentErrors()).toHaveLength(50);
  });

  it('clears errors', () => {
    captureError(new Error('test'));
    clearErrors();
    expect(getRecentErrors()).toHaveLength(0);
  });
});
