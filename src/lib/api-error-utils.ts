import { NextResponse } from 'next/server';
import { logger } from './logger';

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: unknown;
}

/**
 * Creates a standardized error response for API routes
 * @param error - Error object or message
 * @param statusCode - HTTP status code (default: 500)
 * @param context - Additional context for logging
 * @returns NextResponse with error details
 */
export function createErrorResponse(
  error: unknown,
  statusCode: number = 500,
  context?: { component?: string; action?: string }
): NextResponse<{ error: string; details?: unknown }> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = error instanceof Error && 'code' in error ? String(error.code) : undefined;

  // Log the error
  logger.error(error, context);

  // Return standardized response
  return NextResponse.json(
    {
      error: errorMessage,
      ...(errorCode && { code: errorCode }),
      ...(process.env.NODE_ENV === 'development' && error instanceof Error && { details: error.stack }),
    },
    { status: statusCode }
  );
}

/**
 * Creates a standardized success response for API routes
 * @param data - Response data
 * @param statusCode - HTTP status code (default: 200)
 * @returns NextResponse with data
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<T> {
  return NextResponse.json(data, { status: statusCode });
}

/**
 * Validates required environment variables
 * @param vars - Object with variable names as keys and values
 * @param component - Component name for error context
 * @throws Error if any required variable is missing
 */
export function validateEnvVars(
  vars: Record<string, string | undefined>,
  component: string = 'api'
): void {
  const missing: string[] = [];

  for (const [name, value] of Object.entries(vars)) {
    if (!value) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
    logger.error(error, { component, action: 'validateEnvVars' });
    throw error;
  }
}

