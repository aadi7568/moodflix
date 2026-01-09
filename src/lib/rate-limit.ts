/**
 * Rate Limiting with Anonymous Session Tokens
 * 
 * Implements rate limiting using anonymous tokens for better tracking
 * than IP-only rate limiting. Works without requiring user signup.
 */

import { getClientIdentifier } from './anonymous-auth';
import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// In-memory store (for single-instance deployments)
// For production with multiple instances, use Redis (see below)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations per endpoint
export const RATE_LIMITS = {
  'mood-parser': { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  'recommendations': { limit: 5, windowMs: 60 * 1000 }, // 5 per minute
  'search': { limit: 20, windowMs: 60 * 1000 }, // 20 per minute
  'trending': { limit: 30, windowMs: 60 * 1000 }, // 30 per minute
} as const;

type EndpointName = keyof typeof RATE_LIMITS;

/**
 * Check rate limit for a client
 * 
 * @param identifier - Client identifier (token or IP)
 * @param endpoint - Endpoint name
 * @returns Rate limit status
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: EndpointName
): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}> {
  const config = RATE_LIMITS[endpoint];
  if (!config) {
    // No rate limit configured for this endpoint
    return { success: true, remaining: Infinity, reset: Date.now(), limit: Infinity };
  }

  const key = `${endpoint}:${identifier}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Cleanup old entries periodically (1% chance per request)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
      firstRequest: now,
    });

    return {
      success: true,
      remaining: config.limit - 1,
      reset: resetTime,
      limit: config.limit,
    };
  }

  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      reset: entry.resetTime,
      limit: config.limit,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    remaining: config.limit - entry.count,
    reset: entry.resetTime,
    limit: config.limit,
  };
}

/**
 * Cleanup expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

/**
 * Rate limit middleware for API routes
 * 
 * Usage:
 * ```typescript
 * const rateLimitResult = await rateLimitMiddleware(request, 'mood-parser');
 * if (!rateLimitResult.success) {
 *   return rateLimitResult.response;
 * }
 * ```
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  endpoint: EndpointName
): Promise<{
  success: boolean;
  response?: Response;
  remaining?: number;
  reset?: number;
}> {
  const identifier = await getClientIdentifier(request);
  const result = await checkRateLimit(identifier, endpoint);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      ),
    };
  }

  return {
    success: true,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Redis-based rate limiting (for production with multiple instances)
 * 
 * Uncomment and use this if you have multiple server instances or want
 * persistent rate limiting across restarts.
 * 
 * Requires: npm install @upstash/ratelimit @upstash/redis
 */
/*
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const rateLimiters: Record<EndpointName, Ratelimit> = {
  'mood-parser': new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
  }),
  'recommendations': new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
  }),
  'search': new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    analytics: true,
  }),
  'trending': new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
  }),
};

export async function checkRateLimitRedis(
  identifier: string,
  endpoint: EndpointName
): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}> {
  const limiter = rateLimiters[endpoint];
  if (!limiter) {
    return { success: true, remaining: Infinity, reset: Date.now(), limit: Infinity };
  }

  const result = await limiter.limit(identifier);
  
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
    limit: result.limit,
  };
}
*/

