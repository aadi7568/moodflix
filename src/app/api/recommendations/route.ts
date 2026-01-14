import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/tmdb';
import { aiService } from '@/lib/ai-service';
import { MOODS } from '@/config/moods';
import { MoodType } from '@/types/mood';
import { Movie, MovieDetails } from '@/types/movie';
import { getOrCreateSessionToken, setSessionTokenCookie } from '@/lib/anonymous-auth';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { recommendationsSchema } from '@/lib/validators';
import { handleApiError } from '@/lib/error-handler';
import { validateBodySize } from '@/lib/input-sanitizer';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Feature flag to enable/disable AI re-ranking
const ENABLE_AI_RERANKING = process.env.ENABLE_AI_RERANKING !== 'false'; // Default to true if not explicitly disabled
const AI_RERANKING_TIMEOUT = 30000; // 30 seconds timeout for AI analysis

export async function POST(request: NextRequest) {
  // Rate limiting with anonymous session tokens
  const rateLimitResult = await rateLimitMiddleware(request, 'recommendations');
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  // Get or create anonymous session token
  const { token, isNew } = await getOrCreateSessionToken(request);

  try {
    // Validate request body size
    const bodyText = await request.text();
    validateBodySize(bodyText, 10240); // 10KB max
    
    const body = JSON.parse(bodyText);
    
    // Validate with Zod schema
    const validated = recommendationsSchema.parse(body);
    const { mood, preferences, parsedMoodInfo } = validated;

    const moodType = mood as MoodType;
    const moodConfig = MOODS[moodType];

    if (!moodConfig) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mood configuration not found',
        },
        { status: 404 }
      );
    }

    // Fetch movies by genre preferences
    let genreMovies: Movie[] = [];
    try {
      const genreResponse = await tmdbService.getMoviesByGenres(
        moodConfig.genrePreferences,
        1
      );
      genreMovies = genreResponse.results || [];
    } catch (error) {
      console.error('Error fetching movies by genres:', error);
      // Continue with trending movies if genre fetch fails
    }

    // Fetch trending movies
    let trendingMovies: Movie[] = [];
    try {
      const trendingResponse = await tmdbService.getTrending('movie', 'day');
      trendingMovies = trendingResponse.results || [];
    } catch (error) {
      console.error('Error fetching trending movies:', error);
      // If both fail, try to get at least some trending content
      try {
        const fallbackResponse = await tmdbService.getTrending('all', 'week');
        trendingMovies = fallbackResponse.results || [];
      } catch (fallbackError) {
        console.error('Fallback trending fetch also failed:', fallbackError);
      }
    }

    // Combine and deduplicate movies by ID
    const movieMap = new Map<number, Movie>();

    // Add genre-based movies first (higher priority)
    genreMovies.forEach((movie) => {
      if (!movieMap.has(movie.id)) {
        movieMap.set(movie.id, movie);
      }
    });

    // Add trending movies
    trendingMovies.forEach((movie) => {
      if (!movieMap.has(movie.id)) {
        movieMap.set(movie.id, movie);
      }
    });

    // Convert map to array
    const allMovies = Array.from(movieMap.values());

    // Filter movies that match genre preferences
    const genreIds = new Set(moodConfig.genrePreferences);
    const relevantMovies = allMovies.filter((movie) =>
      movie.genre_ids?.some((id) => genreIds.has(id))
    );

    // If we have relevant movies, use them; otherwise use all movies
    const moviesToSort = relevantMovies.length > 0 ? relevantMovies : allMovies;
    
    // If still no movies, return error
    if (moviesToSort.length === 0) {
      console.error('No movies found for mood:', moodType);
      return NextResponse.json(
        {
          success: false,
          error: 'No recommendations found. Please try again or select a different mood.',
          movies: [],
        },
        { status: 200 }
      );
    }

    // Limit to top 30 for AI analysis (to avoid excessive API calls)
    const moviesForAnalysis = moviesToSort.slice(0, 30);

    let sortedMovies: Movie[] = [];
    let emotionalMatchScores: Array<{ movieId: number; score: number; reasoning: string }> | undefined;
    let usedAIReranking = false;

    // Attempt AI re-ranking if enabled
    if (ENABLE_AI_RERANKING) {
      try {
        // Fetch movie details for better emotional analysis (only for movies we'll analyze)
        let movieDetailsMap: Map<number, MovieDetails> | undefined;
        try {
          const movieIds = moviesForAnalysis.map(m => m.id);
          movieDetailsMap = await Promise.race([
            tmdbService.getMoviesDetailsBatch(movieIds, 100),
            new Promise<Map<number, MovieDetails>>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 10000)
            ),
          ]) as Map<number, MovieDetails>;
        } catch (error) {
          console.warn('Error fetching movie details for AI analysis, continuing without:', error);
          // Continue without movie details
        }

        // Perform AI re-ranking with timeout
        const rerankingPromise = aiService.reRankMoviesByMood(
          moviesForAnalysis,
          moodType,
          movieDetailsMap
        );

        const rerankedResults = await Promise.race([
          rerankingPromise,
          new Promise<Array<{ movie: Movie; score: number; reasoning: string }>>((_, reject) =>
            setTimeout(() => reject(new Error('AI re-ranking timeout')), AI_RERANKING_TIMEOUT)
          ),
        ]);

        sortedMovies = rerankedResults.map(result => result.movie);
        emotionalMatchScores = rerankedResults.map(result => ({
          movieId: result.movie.id,
          score: result.score,
          reasoning: result.reasoning,
        }));
        usedAIReranking = true;

        const avgScore = emotionalMatchScores.reduce((sum, s) => sum + s.score, 0) / emotionalMatchScores.length;
        console.log(`AI re-ranking completed for ${sortedMovies.length} movies (avg score: ${avgScore.toFixed(1)})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`AI re-ranking failed (${errorMessage}), falling back to genre-based sorting`);
        // Fall through to genre-based sorting
        usedAIReranking = false;
      }
    }

    // Fallback to genre-based sorting if AI re-ranking wasn't used or failed
    if (!usedAIReranking) {
      sortedMovies = moviesToSort.sort((a, b) => {
        // Primary sort: vote_average
        if (b.vote_average !== a.vote_average) {
          return b.vote_average - a.vote_average;
        }
        // Secondary sort: vote_count
        return b.vote_count - a.vote_count;
      });
    }

    // Get top 20 movies
    const topMovies = sortedMovies.slice(0, 20);

    // Generate explanation message
    const message = preferences
      ? `Based on your ${moodConfig.label.toLowerCase()} mood and preferences, here are personalized recommendations.`
      : usedAIReranking
      ? `Based on your ${moodConfig.label.toLowerCase()} mood, here are ${topMovies.length} AI-curated recommendations that match your emotional tone.`
      : `Based on your ${moodConfig.label.toLowerCase()} mood, here are ${topMovies.length} carefully curated recommendations that match your current vibe.`;

    // Enrich movies with watch providers
    const enrichedMovies = await tmdbService.enrichMoviesWithWatchProviders(topMovies, 'IN');

    interface RecommendationApiResponse {
      success: boolean;
      mood: MoodType;
      movies: Movie[];
      message: string;
      count: number;
      preferences?: string[];
      parsedMoodInfo?: typeof parsedMoodInfo;
      emotionalMatchScores?: Array<{ movieId: number; score: number; reasoning: string }>;
      usedAIReranking?: boolean;
    }

    const response: RecommendationApiResponse = {
      success: true,
      mood: moodType,
      movies: enrichedMovies,
      message,
      count: enrichedMovies.length,
    };

    // Store preferences for future filtering implementation
    if (preferences && Array.isArray(preferences) && preferences.length > 0 && preferences.length <= 20) {
      response.preferences = preferences;
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('User preferences stored:', preferences);
      }
    }

    // Include parsed mood info if available
    if (parsedMoodInfo) {
      response.parsedMoodInfo = parsedMoodInfo;
    }

    // Include emotional match scores if available (only in development with explicit flag)
    const ENABLE_DEBUG_DATA = process.env.ENABLE_DEBUG_DATA === 'true';
    if (emotionalMatchScores && ENABLE_DEBUG_DATA) {
      response.emotionalMatchScores = emotionalMatchScores;
      response.usedAIReranking = usedAIReranking;
    }

    // Create response with session token and rate limit headers
    const httpResponse = NextResponse.json(response, { status: 200 });

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
          error: 'Invalid request data',
          details: process.env.NODE_ENV === 'development' ? error.issues : undefined,
        },
        { status: 400 }
      );
    }

    const { message, status } = handleApiError(error, 'recommendations', 'Failed to generate recommendations');
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

