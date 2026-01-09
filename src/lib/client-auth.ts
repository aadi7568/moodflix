/**
 * Client-side anonymous session token management
 * 
 * Handles token storage and retrieval on the client side.
 * Tokens are stored in localStorage as a fallback if cookies aren't available.
 */

const TOKEN_STORAGE_KEY = 'moodflix_session_token';

/**
 * Get session token from localStorage
 */
export function getClientSessionToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && /^[a-f0-9]{32}$/i.test(token)) {
      return token;
    }
  } catch (error) {
    // localStorage might be disabled or unavailable
    console.warn('Failed to read session token from localStorage:', error);
  }

  return null;
}

/**
 * Store session token in localStorage
 */
export function setClientSessionToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (/^[a-f0-9]{32}$/i.test(token)) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch (error) {
    console.warn('Failed to store session token in localStorage:', error);
  }
}

/**
 * Remove session token from localStorage
 */
export function clearClientSessionToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear session token from localStorage:', error);
  }
}

/**
 * Get session token for API requests
 * 
 * This function checks if a token was returned in a response header
 * and stores it for future requests.
 */
export function handleSessionTokenFromResponse(response: Response): void {
  const token = response.headers.get('x-session-token');
  if (token && /^[a-f0-9]{32}$/i.test(token)) {
    setClientSessionToken(token);
  }
}

/**
 * Get headers to include in API requests
 * 
 * Includes session token if available (as fallback if cookies don't work)
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getClientSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Include token in header as fallback (cookie is primary method)
  if (token) {
    headers['x-session-token'] = token;
  }

  return headers;
}

