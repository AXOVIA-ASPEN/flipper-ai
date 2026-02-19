import { NextResponse } from 'next/server';

/**
 * Standardized error codes for Flipper AI API.
 */
export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

const STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.VALIDATION_ERROR]: 422,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.CONFIGURATION_ERROR]: 500,
};

/**
 * Custom application error with code and optional details.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }

  get statusCode(): number {
    return STATUS_MAP[this.code];
  }
}

/**
 * Standardized API error response shape (RFC 7807 compliant).
 * https://www.rfc-editor.org/rfc/rfc7807
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    type: string; // URI reference identifying the problem type
    title: string; // Short, human-readable summary
    status: number; // HTTP status code
    detail: string; // Human-readable explanation
    instance?: string; // URI reference identifying this occurrence
    code: ErrorCode; // Application-specific error code
    details?: Record<string, unknown>; // Additional structured data
    retryable?: boolean; // Whether this error is retryable
  };
}

/**
 * Error classification for retry strategies.
 */
const RETRYABLE_ERRORS = new Set<ErrorCode>([
  ErrorCode.RATE_LIMITED,
  ErrorCode.SERVICE_UNAVAILABLE,
  ErrorCode.EXTERNAL_SERVICE_ERROR,
]);

/**
 * Create a standardized error NextResponse (RFC 7807 compliant).
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  instance?: string
): NextResponse<ApiErrorResponse> {
  const status = STATUS_MAP[code];
  const retryable = RETRYABLE_ERRORS.has(code);

  return NextResponse.json(
    {
      success: false as const,
      error: {
        type: `https://flipper.ai/errors/${code.toLowerCase()}`,
        title: formatErrorTitle(code),
        status,
        detail: message,
        code,
        retryable,
        ...(instance && { instance }),
        ...(details && { details }),
      },
    },
    { status }
  );
}

/**
 * Format error code to human-readable title.
 */
function formatErrorTitle(code: ErrorCode): string {
  return code
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * User-friendly error messages for common scenarios.
 */
const USER_FRIENDLY_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.BAD_REQUEST]: 'Invalid request. Please check your input and try again.',
  [ErrorCode.UNAUTHORIZED]: 'Please log in to continue.',
  [ErrorCode.FORBIDDEN]: "You don't have permission to access this resource.",
  [ErrorCode.NOT_FOUND]: 'The requested item could not be found.',
  [ErrorCode.CONFLICT]: 'This action conflicts with existing data.',
  [ErrorCode.RATE_LIMITED]:
    'Too many requests. Please wait a moment before trying again.',
  [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorCode.INTERNAL_ERROR]: 'Something went wrong. Our team has been notified.',
  [ErrorCode.SERVICE_UNAVAILABLE]:
    'Service temporarily unavailable. Please try again in a few moments.',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]:
    'Unable to connect to external service. Please try again later.',
  [ErrorCode.CONFIGURATION_ERROR]: 'Configuration error. Please contact support.',
};

/**
 * Filter stack trace in production to hide internal paths.
 */
function filterStackTrace(stack: string | undefined): string | undefined {
  if (!stack || process.env.NODE_ENV !== 'production') {
    return stack;
  }

  return stack
    .split('\n')
    .filter((line) => {
      // Filter out node_modules and internal paths
      return !line.includes('node_modules') && !line.includes('webpack');
    })
    .join('\n');
}

/**
 * Get user-friendly error message with optional technical details.
 */
export function getUserFriendlyMessage(
  code: ErrorCode,
  technicalMessage?: string
): string {
  const friendlyMessage = USER_FRIENDLY_MESSAGES[code] || USER_FRIENDLY_MESSAGES[ErrorCode.INTERNAL_ERROR];
  
  if (process.env.NODE_ENV === 'development' && technicalMessage) {
    return `${friendlyMessage}\n\nTechnical details: ${technicalMessage}`;
  }
  
  return friendlyMessage;
}

/**
 * Convert an unknown error to a standardized error response.
 * Handles AppError, Error, and unknown types.
 */
export function handleError(error: unknown, instance?: string): NextResponse<ApiErrorResponse> {
  if (error instanceof AppError) {
    const userMessage = getUserFriendlyMessage(error.code, error.message);
    return errorResponse(error.code, userMessage, error.details, instance);
  }

  if (error instanceof Error) {
    // Check for common patterns
    if (error.message.includes('blocked') || error.message.includes('captcha')) {
      const userMessage = getUserFriendlyMessage(ErrorCode.RATE_LIMITED, error.message);
      return errorResponse(ErrorCode.RATE_LIMITED, userMessage, undefined, instance);
    }
    if (error.message.includes('not found') || error.message.includes('Not Found')) {
      const userMessage = getUserFriendlyMessage(ErrorCode.NOT_FOUND, error.message);
      return errorResponse(ErrorCode.NOT_FOUND, userMessage, undefined, instance);
    }

    // Log unexpected errors with filtered stack
    console.error('Unhandled error:', {
      message: error.message,
      stack: filterStackTrace(error.stack),
    });
    
    const userMessage = getUserFriendlyMessage(ErrorCode.INTERNAL_ERROR, error.message);
    return errorResponse(ErrorCode.INTERNAL_ERROR, userMessage, undefined, instance);
  }

  console.error('Unknown error:', error);
  const userMessage = getUserFriendlyMessage(ErrorCode.INTERNAL_ERROR);
  return errorResponse(ErrorCode.INTERNAL_ERROR, userMessage, undefined, instance);
}

/**
 * Custom error classes for specific error types.
 */
export class NotFoundError extends AppError {
  constructor(resource: string, details?: Record<string, unknown>) {
    super(ErrorCode.NOT_FOUND, `${resource} not found`, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super(ErrorCode.UNAUTHORIZED, message, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', details?: Record<string, unknown>) {
    super(ErrorCode.FORBIDDEN, message, details);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super(ErrorCode.RATE_LIMITED, message, details);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: Record<string, unknown>) {
    super(ErrorCode.EXTERNAL_SERVICE_ERROR, `${service}: ${message}`, details);
    this.name = 'ExternalServiceError';
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.CONFIGURATION_ERROR, message, details);
    this.name = 'ConfigurationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.CONFLICT, message, details);
    this.name = 'ConflictError';
  }
}

/**
 * Convenience factory functions for common errors.
 * @deprecated Use specific error classes (NotFoundError, ValidationError, etc.) instead
 */
export const Errors = {
  badRequest: (message: string, details?: Record<string, unknown>) =>
    new AppError(ErrorCode.BAD_REQUEST, message, details),

  unauthorized: (message = 'Authentication required') => new UnauthorizedError(message),

  forbidden: (message = 'Access denied') => new ForbiddenError(message),

  notFound: (resource: string) => new NotFoundError(resource),

  rateLimited: (message = 'Rate limit exceeded. Please try again later.') =>
    new RateLimitError(message),

  validation: (message: string, details?: Record<string, unknown>) =>
    new ValidationError(message, details),

  internal: (message = 'Internal server error') =>
    new AppError(ErrorCode.INTERNAL_ERROR, message),

  configError: (message: string) => new ConfigurationError(message),

  externalService: (service: string, message: string) =>
    new ExternalServiceError(service, message),
} as const;
