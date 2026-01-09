/**
 * Secure Error Handling
 * 
 * Prevents information disclosure by sanitizing error messages
 * in production while allowing detailed errors in development
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Handle API errors securely
 * Returns safe error messages in production, detailed in development
 */
export function handleApiError(
  error: unknown,
  context: string,
  defaultMessage: string = 'An error occurred processing your request'
): {
  message: string;
  status: number;
  logDetails?: unknown;
} {
  // Log full error details server-side (never exposed to client)
  if (error instanceof Error) {
    console.error(`[${context}] Error:`, {
      message: error.message,
      stack: isDevelopment ? error.stack : undefined,
      name: error.name,
    });
  } else {
    console.error(`[${context}] Unknown error:`, error);
  }

  // Return safe error message
  if (isDevelopment && error instanceof Error) {
    // In development, can expose more details for debugging
    return {
      message: error.message,
      status: 500,
      logDetails: error,
    };
  }

  // In production, always return generic message
  return {
    message: defaultMessage,
    status: 500,
  };
}

/**
 * Create a safe error response
 */
export function createErrorResponse(
  error: unknown,
  context: string,
  defaultMessage: string = 'An error occurred processing your request'
): { success: false; error: string } {
  const { message } = handleApiError(error, context, defaultMessage);
  return {
    success: false,
    error: message,
  };
}

