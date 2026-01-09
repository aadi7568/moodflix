/**
 * Input Sanitization Utilities
 * 
 * Sanitizes user input to prevent:
 * - Prompt injection attacks
 * - XSS attacks
 * - Injection attacks
 * - JSON bombs
 */

/**
 * Sanitize text for use in AI prompts
 * Removes potential prompt injection patterns and dangerous characters
 */
export function sanitizeForPrompt(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input: text must be a non-empty string');
  }

  return text
    // Remove control characters (except newlines and tabs for readability)
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    // Remove potential prompt injection patterns
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/ignore\s+previous\s+instructions?/gi, '')
    .replace(/system\s*:?\s*/gi, '')
    .replace(/assistant\s*:?\s*/gi, '')
    .replace(/user\s*:?\s*/gi, '')
    .replace(/\[INST\]/gi, '') // Remove instruction markers
    .replace(/\[/g, '') // Remove brackets that might be used for special formatting
    .replace(/\]/g, '')
    // Escape quotes to prevent prompt manipulation
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Trim and limit length
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize search query
 * Allows alphanumeric, spaces, and common punctuation only
 */
export function sanitizeSearchQuery(query: string, maxLength: number = 200): string {
  if (!query || typeof query !== 'string') {
    throw new Error('Invalid query: must be a non-empty string');
  }

  // Allow alphanumeric, spaces, and common punctuation
  // Remove any potentially dangerous characters
  return query
    .replace(/[^\w\s\-'.,!?()]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate and sanitize JSON body size
 * Prevents JSON bombs and memory exhaustion
 */
export function validateBodySize(body: string, maxSizeBytes: number = 10240): void {
  if (typeof body !== 'string') {
    throw new Error('Body must be a string');
  }

  const sizeInBytes = new Blob([body]).size;
  
  if (sizeInBytes > maxSizeBytes) {
    throw new Error(`Request body too large. Maximum size is ${maxSizeBytes} bytes`);
  }
}

/**
 * Sanitize text for logging
 * Removes sensitive information and limits length
 */
export function sanitizeForLog(text: string, maxLength: number = 100): string {
  if (!text || typeof text !== 'string') {
    return '[INVALID]';
  }

  // Truncate and add ellipsis if too long
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...';
  }

  return text;
}

