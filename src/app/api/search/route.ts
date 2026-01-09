import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/tmdb';
import { Movie } from '@/types/movie';
import { getOrCreateSessionToken, setSessionTokenCookie } from '@/lib/anonymous-auth';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { searchQuerySchema } from '@/lib/validators';
import { handleApiError } from '@/lib/error-handler';
import { sanitizeSearchQuery } from '@/lib/input-sanitizer';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Rate limiting with anonymous session tokens
  const rateLimitResult = await rateLimitMiddleware(request, 'search');
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  // Get or create anonymous session token
  const { token, isNew } = await getOrCreateSessionToken(request);

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    // Validate with Zod schema
    const validated = searchQuerySchema.parse({ query: query || '' });
    const trimmedQuery = validated.query.trim();
    
    // Sanitize query before using
    const sanitizedQuery = sanitizeSearchQuery(trimmedQuery, 200);

    // Search for movies
    let searchResponse;
    try {
      searchResponse = await tmdbService.searchMovies(sanitizedQuery, 1);
    } catch (error) {
      const { message } = handleApiError(error, 'search', 'Failed to search movies. Please try again.');
      return NextResponse.json(
        {
          success: false,
          error: message,
          movies: [],
        },
        { status: 500 }
      );
    }

    const movies: Movie[] = searchResponse.results || [];

    // Create response with session token and rate limit headers
    const response = NextResponse.json(
      {
        success: true,
        movies,
        count: movies.length,
        query: sanitizedQuery,
      },
      { status: 200 }
    );

    // Set cookie if new token was created
    if (isNew) {
      const cookie = setSessionTokenCookie(token);
      response.cookies.set(cookie.name, cookie.value, cookie.options);
      // Also include in header for client-side storage fallback
      response.headers.set('x-session-token', token);
    }

    // Add rate limit headers
    if (rateLimitResult.remaining !== undefined && rateLimitResult.reset !== undefined) {
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    }

    return response;
  } catch (error) {
    // Handle validation errors separately
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid search query',
          details: process.env.NODE_ENV === 'development' ? error.issues : undefined,
          movies: [],
        },
        { status: 400 }
      );
    }

    const { message, status } = handleApiError(error, 'search', 'Failed to process search request');
    return NextResponse.json(
      {
        success: false,
        error: message,
        movies: [],
      },
      { status }
    );
  }
}

