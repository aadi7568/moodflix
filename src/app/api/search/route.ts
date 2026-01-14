import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/tmdb';
import { searchInterpreter } from '@/lib/search-interpreter';
import { Movie } from '@/types/movie';
import { getOrCreateSessionToken, setSessionTokenCookie } from '@/lib/anonymous-auth';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { searchQuerySchema } from '@/lib/validators';
import { handleApiError } from '@/lib/error-handler';
import { sanitizeSearchQuery } from '@/lib/input-sanitizer';
import { buildImdbUrl } from '@/lib/utils';
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

    // Classify search intent using AI
    const intentResult = await searchInterpreter.classifyIntent(sanitizedQuery);
    
    let movies: Movie[] = [];
    let searchType: 'specific' | 'similar' | 'generic' = 'generic';

    try {
      // Handle different intent types
      if (intentResult.intent === 'similar_movies' && intentResult.movieTitle) {
        // User wants movies similar to a specific movie
        searchType = 'similar';
        
        // First, search for the movie they mentioned
        const movieSearchResponse = await tmdbService.searchMovies(intentResult.movieTitle, 1);
        const matchingMovies = movieSearchResponse.results || [];
        
        if (matchingMovies.length > 0) {
          // Use the first result as the reference movie
          const referenceMovie = matchingMovies[0];
          
          // Get similar movies (limit to 10 as specified)
          const similarResponse = await tmdbService.getSimilarMovies(referenceMovie.id, 1);
          movies = (similarResponse.results || []).slice(0, 10);
        } else {
          // Movie not found, fallback to direct search
          const fallbackResponse = await tmdbService.searchMovies(sanitizedQuery, 1);
          movies = fallbackResponse.results || [];
        }
      } else if (intentResult.intent === 'specific_movie') {
        // User is searching for a specific movie
        searchType = 'specific';
        const searchResponse = await tmdbService.searchMovies(sanitizedQuery, 1);
        movies = searchResponse.results || [];
      } else {
        // Generic search (fallback or default)
        searchType = 'generic';
        const searchResponse = await tmdbService.searchMovies(sanitizedQuery, 1);
        movies = searchResponse.results || [];
      }

      // Fetch IMDb IDs and watch providers for all movies in batch
      if (movies.length > 0) {
        const movieIds = movies.map(m => m.id);
        const [externalIdsMap, enrichedMovies] = await Promise.all([
          tmdbService.getMoviesExternalIdsBatch(movieIds, 100),
          tmdbService.enrichMoviesWithWatchProviders(movies, 'IN'),
        ]);
        
        // Enrich movies with IMDb IDs and URLs (watch providers already added)
        movies = enrichedMovies.map(movie => {
          const externalIds = externalIdsMap.get(movie.id);
          const imdbId = externalIds?.imdb_id || null;
          const imdbUrl = buildImdbUrl(imdbId);
          
          return {
            ...movie,
            imdb_id: imdbId,
            imdb_url: imdbUrl,
          };
        });
      }
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

    // Create response with session token and rate limit headers
    const response = NextResponse.json(
      {
        success: true,
        movies,
        count: movies.length,
        query: sanitizedQuery,
        intent: intentResult.intent,
        searchType,
        // Include intent metadata in development mode
        ...(process.env.NODE_ENV === 'development' && {
          intentMetadata: {
            confidence: intentResult.confidence,
            reasoning: intentResult.reasoning,
            extractedTitle: intentResult.movieTitle,
          },
        }),
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

