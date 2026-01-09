import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/tmdb';
import { Movie } from '@/types/movie';
import { getOrCreateSessionToken, setSessionTokenCookie } from '@/lib/anonymous-auth';
import { rateLimitMiddleware } from '@/lib/rate-limit';

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

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query is required',
          movies: [],
        },
        { status: 400 }
      );
    }

    // Trim and validate query length
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query cannot be empty',
          movies: [],
        },
        { status: 400 }
      );
    }

    // Search for movies
    let searchResponse;
    try {
      searchResponse = await tmdbService.searchMovies(trimmedQuery, 1);
    } catch (error) {
      console.error('Error searching movies:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to search movies. Please try again.',
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
        query: trimmedQuery,
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
    console.error('Error in search endpoint:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process search request',
        movies: [],
      },
      { status: 500 }
    );
  }
}

