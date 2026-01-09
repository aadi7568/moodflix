import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/tmdb';
import { getOrCreateSessionToken, setSessionTokenCookie } from '@/lib/anonymous-auth';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Rate limiting with anonymous session tokens
  const rateLimitResult = await rateLimitMiddleware(request, 'trending');
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  // Get or create anonymous session token
  const { token, isNew } = await getOrCreateSessionToken(request);

  try {
    const searchParams = request.nextUrl.searchParams;
    const mediaType = (searchParams.get('mediaType') as 'movie' | 'tv' | 'all') || 'all';
    const timeWindow = (searchParams.get('timeWindow') as 'day' | 'week') || 'day';

    // Validate query parameters
    if (mediaType && !['movie', 'tv', 'all'].includes(mediaType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid mediaType. Must be "movie", "tv", or "all"',
        },
        { status: 400 }
      );
    }

    if (timeWindow && !['day', 'week'].includes(timeWindow)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid timeWindow. Must be "day" or "week"',
        },
        { status: 400 }
      );
    }

    // Fetch trending content from TMDB
    const tmdbResponse = await tmdbService.getTrending(mediaType, timeWindow);

    // Create response with session token and rate limit headers
    const httpResponse = NextResponse.json(
      {
        success: true,
        data: tmdbResponse.results,
        page: tmdbResponse.page,
        totalPages: tmdbResponse.total_pages,
        totalResults: tmdbResponse.total_results,
      },
      { status: 200 }
    );

    // Set cookie if new token was created
    if (isNew) {
      const cookie = setSessionTokenCookie(token);
      httpResponse.cookies.set(cookie.name, cookie.value, cookie.options);
      // Also include in header for client-side storage fallback
      httpResponse.headers.set('x-session-token', token);
    }

    // Add rate limit headers
    if (rateLimitResult.remaining !== undefined && rateLimitResult.reset !== undefined) {
      httpResponse.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      httpResponse.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    }

    return httpResponse;
  } catch (error) {
    console.error('Error fetching trending content:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trending content',
      },
      { status: 500 }
    );
  }
}

