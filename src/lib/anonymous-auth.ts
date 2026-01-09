import { NextRequest } from 'next/server';

/**
 * Anonymous Session Token System
 * 
 * Generates and validates anonymous tokens for users without requiring signup.
 * Tokens are stored in HTTP-only cookies for security and localStorage as fallback.
 * 
 * Benefits:
 * - No user signup required
 * - Better rate limiting than IP-only (handles shared IPs, VPNs)
 * - Can track and revoke abusive sessions
 * - Privacy-friendly (no PII collected)
 */

const TOKEN_COOKIE_NAME = 'moodflix_session';
const TOKEN_HEADER_NAME = 'x-session-token';
const TOKEN_LENGTH = 32; // 32 character hex string
const TOKEN_EXPIRY_DAYS = 30; // Tokens expire after 30 days

/**
 * Generate a cryptographically secure random token
 */
export function generateAnonymousToken(): string {
  // Use crypto.randomBytes for secure random generation
  const array = new Uint8Array(TOKEN_LENGTH / 2);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto (shouldn't happen in Node.js)
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate token format (basic check)
 */
export function isValidTokenFormat(token: string): boolean {
  return /^[a-f0-9]{32}$/i.test(token);
}

/**
 * Get or create anonymous session token from request
 * 
 * Priority:
 * 1. Cookie (most secure, HTTP-only)
 * 2. Header (for API clients)
 * 3. Generate new token if none exists
 */
export async function getOrCreateSessionToken(request: NextRequest): Promise<{
  token: string;
  isNew: boolean;
}> {
  // Try to get token from cookie first (most secure)
  const cookieToken = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  
  if (cookieToken && isValidTokenFormat(cookieToken)) {
    return { token: cookieToken, isNew: false };
  }

  // Try header as fallback (for API clients)
  const headerToken = request.headers.get(TOKEN_HEADER_NAME);
  
  if (headerToken && isValidTokenFormat(headerToken)) {
    return { token: headerToken, isNew: false };
  }

  // Generate new token
  const newToken = generateAnonymousToken();
  return { token: newToken, isNew: true };
}

/**
 * Set session token in response cookie
 */
export function setSessionTokenCookie(token: string): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    maxAge: number;
    path: string;
  };
} {
  return {
    name: TOKEN_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true, // Prevents XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // CSRF protection
      maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    },
  };
}

/**
 * Extract session token from request (for use in API routes)
 */
export function extractSessionToken(request: NextRequest): string | null {
  // Try cookie first
  const cookieToken = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (cookieToken && isValidTokenFormat(cookieToken)) {
    return cookieToken;
  }

  // Try header
  const headerToken = request.headers.get(TOKEN_HEADER_NAME);
  if (headerToken && isValidTokenFormat(headerToken)) {
    return headerToken;
  }

  return null;
}

/**
 * Get client identifier for rate limiting
 * Combines token (if available) with IP for better tracking
 */
export async function getClientIdentifier(request: NextRequest): Promise<string> {
  const token = extractSessionToken(request);
  const ip = getClientIP(request);
  
  // Use token if available, otherwise fall back to IP
  // This allows better rate limiting per session
  return token ? `token:${token}` : `ip:${ip}`;
}

/**
 * Extract client IP from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers (for proxies, load balancers, CDNs)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  const ip = forwarded?.split(',')[0]?.trim() 
    || realIp?.trim() 
    || cfConnectingIp?.trim()
    || request.ip
    || 'unknown';
  
  return ip;
}

