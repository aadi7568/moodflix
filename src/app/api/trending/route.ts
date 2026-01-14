import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/tmdb';
import { getOrCreateSessionToken, setSessionTokenCookie } from '@/lib/anonymous-auth';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { trendingParamsSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/error-handler';
import { Movie } from '@/types/movie';
import { z } from 'zod';

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
    
    // Validate with Zod schema
    const validated = trendingParamsSchema.parse({
      mediaType: searchParams.get('mediaType') || 'all',
      timeWindow: searchParams.get('timeWindow') || 'day',
      region: searchParams.get('region') || 'IN',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
    });
    
    const { mediaType, timeWindow, region, limit } = validated;

    let responseData: {
      success: boolean;
      data?: Movie[];
      movies?: Movie[];
      tvShows?: Movie[];
      page?: number;
      totalPages?: number;
      totalResults?: number;
    };

    // Use India-specific trending if region is IN
    if (region === 'IN') {
      if (mediaType === 'all') {
        // Fetch both movies and TV shows separately
        const { movies, tvShows } = await tmdbService.getTop10TrendingInIndia();
        responseData = {
          success: true,
          movies,
          tvShows,
        };
      } else {
        // Fetch single media type
        const tmdbResponse = await tmdbService.getTrendingInIndia(
          mediaType as 'movie' | 'tv',
          1,
          limit || 10
        );
        responseData = {
          success: true,
          data: tmdbResponse.results,
          page: tmdbResponse.page,
          totalPages: tmdbResponse.total_pages,
          totalResults: tmdbResponse.total_results,
        };
      }
    } else {
      // Use global trending for other regions
      const tmdbResponse = await tmdbService.getTrending(mediaType, timeWindow);
      responseData = {
        success: true,
        data: tmdbResponse.results,
        page: tmdbResponse.page,
        totalPages: tmdbResponse.total_pages,
        totalResults: tmdbResponse.total_results,
      };
    }

    // Create response with session token and rate limit headers
    const httpResponse = NextResponse.json(responseData, { status: 200 });

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
    // Handle validation errors separately
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: process.env.NODE_ENV === 'development' ? error.issues : undefined,
        },
        { status: 400 }
      );
    }

    const { message, status } = handleApiError(error, 'trending', 'Failed to fetch trending content');
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

