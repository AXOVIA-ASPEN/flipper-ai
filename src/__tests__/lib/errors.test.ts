import {
  ErrorCode,
  AppError,
  errorResponse,
  handleError,
  Errors,
  ApiErrorResponse,
} from '@/lib/errors';

describe('Error Handling Module', () => {
  describe('AppError', () => {
    it('creates an error with code and message', () => {
      const err = new AppError(ErrorCode.BAD_REQUEST, 'Invalid input');
      expect(err.code).toBe(ErrorCode.BAD_REQUEST);
      expect(err.message).toBe('Invalid input');
      expect(err.name).toBe('AppError');
      expect(err.details).toBeUndefined();
    });

    it('includes optional details', () => {
      const details = { field: 'email', reason: 'required' };
      const err = new AppError(ErrorCode.VALIDATION_ERROR, 'Validation failed', details);
      expect(err.details).toEqual(details);
    });

    it('returns correct status code for each error code', () => {
      expect(new AppError(ErrorCode.BAD_REQUEST, '').statusCode).toBe(400);
      expect(new AppError(ErrorCode.UNAUTHORIZED, '').statusCode).toBe(401);
      expect(new AppError(ErrorCode.FORBIDDEN, '').statusCode).toBe(403);
      expect(new AppError(ErrorCode.NOT_FOUND, '').statusCode).toBe(404);
      expect(new AppError(ErrorCode.CONFLICT, '').statusCode).toBe(409);
      expect(new AppError(ErrorCode.RATE_LIMITED, '').statusCode).toBe(429);
      expect(new AppError(ErrorCode.VALIDATION_ERROR, '').statusCode).toBe(422);
      expect(new AppError(ErrorCode.INTERNAL_ERROR, '').statusCode).toBe(500);
      expect(new AppError(ErrorCode.SERVICE_UNAVAILABLE, '').statusCode).toBe(503);
      expect(new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, '').statusCode).toBe(502);
      expect(new AppError(ErrorCode.CONFIGURATION_ERROR, '').statusCode).toBe(500);
    });

    it('is an instance of Error', () => {
      const err = new AppError(ErrorCode.INTERNAL_ERROR, 'test');
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('errorResponse', () => {
    it('creates a NextResponse with correct status and body', async () => {
      const response = errorResponse(ErrorCode.NOT_FOUND, 'User not found');
      const data: ApiErrorResponse = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe(ErrorCode.NOT_FOUND);
      expect(data.error.detail).toBe('User not found');
      expect(data.error.details).toBeUndefined();
    });

    it('includes details when provided', async () => {
      const details = { field: 'name', max: 100 };
      const response = errorResponse(ErrorCode.VALIDATION_ERROR, 'Too long', details);
      const data: ApiErrorResponse = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.details).toEqual(details);
    });

    it('omits details key when not provided', async () => {
      const response = errorResponse(ErrorCode.INTERNAL_ERROR, 'Oops');
      const data: ApiErrorResponse = await response.json();

      expect(data.error).not.toHaveProperty('details');
    });
  });

  describe('handleError', () => {
    it('handles AppError correctly', async () => {
      const err = new AppError(ErrorCode.FORBIDDEN, 'No access', { role: 'guest' });
      const response = handleError(err);
      const data: ApiErrorResponse = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe(ErrorCode.FORBIDDEN);
      // User-friendly message for FORBIDDEN
      expect(data.error.detail).toBe("You don't have permission to access this resource.");
      expect(data.error.details).toEqual({ role: 'guest' });
    });

    it('detects blocked/captcha errors as rate limited', async () => {
      const err = new Error('Request blocked by OfferUp');
      const response = handleError(err);
      const data: ApiErrorResponse = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe(ErrorCode.RATE_LIMITED);
    });

    it('detects captcha errors as rate limited', async () => {
      const err = new Error('captcha required');
      const response = handleError(err);
      const data: ApiErrorResponse = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe(ErrorCode.RATE_LIMITED);
    });

    it('detects not found errors', async () => {
      const err = new Error('Listing not found');
      const response = handleError(err);
      const data: ApiErrorResponse = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe(ErrorCode.NOT_FOUND);
    });

    it('detects Not Found (capitalized) errors', async () => {
      const err = new Error('Resource Not Found in database');
      const response = handleError(err);
      const data: ApiErrorResponse = await response.json();

      expect(response.status).toBe(404);
    });

    it('falls back to internal error for generic Error', async () => {
      const err = new Error('Something unexpected happened');
      const response = handleError(err);
      const data: ApiErrorResponse = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe(ErrorCode.INTERNAL_ERROR);
      // Expect user-friendly message in production
      expect(data.error.detail).toBe('Something went wrong. Our team has been notified.');
    });

    it('handles unknown error types (string)', async () => {
      const response = handleError('string error');
      const data: ApiErrorResponse = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe(ErrorCode.INTERNAL_ERROR);
      // Expect user-friendly message for unknown errors
      expect(data.error.detail).toBe('Something went wrong. Our team has been notified.');
    });

    it('handles unknown error types (null)', async () => {
      const response = handleError(null);
      const data: ApiErrorResponse = await response.json();

      expect(response.status).toBe(500);
    });

    it('handles unknown error types (number)', async () => {
      const response = handleError(42);
      const data: ApiErrorResponse = await response.json();

      expect(response.status).toBe(500);
    });

    it('logs unexpected errors', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      handleError(new Error('unexpected'));
      expect(spy).toHaveBeenCalledWith('Unhandled error:', expect.objectContaining({
        message: 'unexpected',
        stack: expect.any(String)
      }));
      spy.mockRestore();
    });

    it('logs unknown error types', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      handleError({ weird: 'object' });
      expect(spy).toHaveBeenCalledWith('Unknown error:', { weird: 'object' });
      spy.mockRestore();
    });
  });

  describe('Errors factory', () => {
    it('creates badRequest error', () => {
      const err = Errors.badRequest('Missing field');
      expect(err.code).toBe(ErrorCode.BAD_REQUEST);
      expect(err.message).toBe('Missing field');
    });

    it('creates badRequest error with details', () => {
      const err = Errors.badRequest('Invalid', { field: 'name' });
      expect(err.details).toEqual({ field: 'name' });
    });

    it('creates unauthorized error with default message', () => {
      const err = Errors.unauthorized();
      expect(err.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(err.message).toBe('Authentication required');
    });

    it('creates unauthorized error with custom message', () => {
      const err = Errors.unauthorized('Token expired');
      expect(err.message).toBe('Token expired');
    });

    it('creates forbidden error with default message', () => {
      const err = Errors.forbidden();
      expect(err.message).toBe('Access denied');
    });

    it('creates notFound error', () => {
      const err = Errors.notFound('Listing');
      expect(err.code).toBe(ErrorCode.NOT_FOUND);
      expect(err.message).toBe('Listing not found');
    });

    it('creates rateLimited error with default message', () => {
      const err = Errors.rateLimited();
      expect(err.code).toBe(ErrorCode.RATE_LIMITED);
      expect(err.message).toContain('Rate limit');
    });

    it('creates validation error with details', () => {
      const err = Errors.validation('Invalid email', { field: 'email' });
      expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(err.details).toEqual({ field: 'email' });
    });

    it('creates internal error with default message', () => {
      const err = Errors.internal();
      expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(err.message).toBe('Internal server error');
    });

    it('creates configError', () => {
      const err = Errors.configError('Missing API key');
      expect(err.code).toBe(ErrorCode.CONFIGURATION_ERROR);
      expect(err.message).toBe('Missing API key');
    });

    it('creates externalService error', () => {
      const err = Errors.externalService('OpenAI', 'rate limited');
      expect(err.code).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
      expect(err.message).toBe('OpenAI: rate limited');
      expect(err.statusCode).toBe(502);
    });
  });
});
