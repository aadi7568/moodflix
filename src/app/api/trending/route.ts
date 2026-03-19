import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/tmdb';
import { youtubeService } from '@/lib/youtube';
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
      globalMovies?: Movie[];
      globalTVShows?: Movie[];
      page?: number;
      totalPages?: number;
      totalResults?: number;
    };

    if (region === 'IN') {
      if (mediaType === 'all') {
        // Fetch India-specific trending AND global trending in parallel.
        // YouTube service is optional — falls back to empty arrays if YOUTUBE_API_KEY is not set.
        const [indiaMovies, indiaTVShows, { movies: globalMovies, tvShows: globalTVShows }, ytResult] = await Promise.all([
          tmdbService.getIndiaTrendingMovies(limit || 10),
          tmdbService.getIndiaTrendingTVShows(limit || 10),
          tmdbService.getGlobalTrending(limit || 10),
          youtubeService.getYouTubeTrendingForIndia(),
        ]);

        // Merge YouTube results into India trending, deduplicating by TMDB id.
        // YouTube signal takes the top slots; TMDB India fills the rest.
        const mergeWithYouTube = (ytMovies: Movie[], tmdbMovies: Movie[], cap: number): Movie[] => {
          if (ytMovies.length === 0) return tmdbMovies.slice(0, cap);
          const seen = new Set(ytMovies.map(m => m.id));
          const merged = [...ytMovies, ...tmdbMovies.filter(m => !seen.has(m.id))];
          return merged.slice(0, cap);
        };

        const cap = limit || 10;
        const mergedIndiaMovies = mergeWithYouTube(ytResult.movies, indiaMovies, cap);
        const mergedIndiaTVShows = mergeWithYouTube(ytResult.tvShows, indiaTVShows, cap);

        // Enrich all with watch providers in parallel
        const [enrichedIndiaMovies, enrichedIndiaTVShows, enrichedGlobalMovies, enrichedGlobalTVShows] = await Promise.all([
          tmdbService.enrichMoviesWithWatchProviders(mergedIndiaMovies, 'IN'),
          tmdbService.enrichMoviesWithWatchProviders(mergedIndiaTVShows, 'IN'),
          tmdbService.enrichMoviesWithWatchProviders(globalMovies, 'IN'),
          tmdbService.enrichMoviesWithWatchProviders(globalTVShows, 'IN'),
        ]);
        responseData = {
          success: true,
          movies: enrichedIndiaMovies,
          tvShows: enrichedIndiaTVShows,
          globalMovies: enrichedGlobalMovies,
          globalTVShows: enrichedGlobalTVShows,
        };
      } else if (mediaType === 'movie') {
        const movies = await tmdbService.getIndiaTrendingMovies(limit || 10);
        const enrichedMovies = await tmdbService.enrichMoviesWithWatchProviders(movies, 'IN');
        responseData = {
          success: true,
          data: enrichedMovies,
          page: 1,
          totalPages: 1,
          totalResults: enrichedMovies.length,
        };
      } else {
        const tvShows = await tmdbService.getIndiaTrendingTVShows(limit || 10);
        const enrichedTVShows = await tmdbService.enrichMoviesWithWatchProviders(tvShows, 'IN');
        responseData = {
          success: true,
          data: enrichedTVShows,
          page: 1,
          totalPages: 1,
          totalResults: enrichedTVShows.length,
        };
      }
    } else {
      // Use global trending for other regions
      const tmdbResponse = await tmdbService.getTrending(mediaType, timeWindow);
      const enrichedMovies = await tmdbService.enrichMoviesWithWatchProviders(tmdbResponse.results, region);
      responseData = {
        success: true,
        data: enrichedMovies,
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

