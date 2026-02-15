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
 * Standardized API error response shape.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Create a standardized error NextResponse.
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const status = STATUS_MAP[code];
  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  );
}

/**
 * Convert an unknown error to a standardized error response.
 * Handles AppError, Error, and unknown types.
 */
export function handleError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.details);
  }

  if (error instanceof Error) {
    // Check for common patterns
    if (error.message.includes('blocked') || error.message.includes('captcha')) {
      return errorResponse(ErrorCode.RATE_LIMITED, error.message);
    }
    if (error.message.includes('not found') || error.message.includes('Not Found')) {
      return errorResponse(ErrorCode.NOT_FOUND, error.message);
    }

    // Log unexpected errors
    console.error('Unhandled error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, error.message);
  }

  console.error('Unknown error:', error);
  return errorResponse(ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred');
}

/**
 * Convenience factory functions for common errors.
 */
export const Errors = {
  badRequest: (message: string, details?: Record<string, unknown>) =>
    new AppError(ErrorCode.BAD_REQUEST, message, details),

  unauthorized: (message = 'Authentication required') =>
    new AppError(ErrorCode.UNAUTHORIZED, message),

  forbidden: (message = 'Access denied') => new AppError(ErrorCode.FORBIDDEN, message),

  notFound: (resource: string) => new AppError(ErrorCode.NOT_FOUND, `${resource} not found`),

  rateLimited: (message = 'Rate limit exceeded. Please try again later.') =>
    new AppError(ErrorCode.RATE_LIMITED, message),

  validation: (message: string, details?: Record<string, unknown>) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, details),

  internal: (message = 'Internal server error') =>
    new AppError(ErrorCode.INTERNAL_ERROR, message),

  configError: (message: string) => new AppError(ErrorCode.CONFIGURATION_ERROR, message),

  externalService: (service: string, message: string) =>
    new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, `${service}: ${message}`),
} as const;
