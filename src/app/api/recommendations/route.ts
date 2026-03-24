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

const ENABLE_AI_RERANKING = process.env.ENABLE_AI_RERANKING !== 'false';
const AI_RERANKING_TIMEOUT = 30000;

/** Deduplicate, filter by mood genres, sort by vote_average desc, take top N */
function buildPool(items: Movie[], genreIds: Set<number>, limit: number): Movie[] {
  const seen = new Set<number>();
  const unique = items.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
  const relevant = unique.filter(m => m.genre_ids?.some(id => genreIds.has(id)));
  const pool = relevant.length > 0 ? relevant : unique;
  return pool
    .sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count)
    .slice(0, limit);
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimitMiddleware(request, 'recommendations');
  if (!rateLimitResult.success) return rateLimitResult.response!;

  const { token, isNew } = await getOrCreateSessionToken(request);

  try {
    const bodyText = await request.text();
    validateBodySize(bodyText, 10240);
    const body = JSON.parse(bodyText);
    const validated = recommendationsSchema.parse(body);
    const { mood, preferences, parsedMoodInfo } = validated;

    const moodType = mood as MoodType;
    const moodConfig = MOODS[moodType];

    if (!moodConfig) {
      return NextResponse.json({ success: false, error: 'Mood configuration not found' }, { status: 404 });
    }

    const genreIds = moodConfig.genrePreferences;

    // ── Fetch all 4 pools in parallel ──────────────────────────────────────────
    const [
      globalMoviesRes,
      globalTVRes,
      indiaMoviesRes,
      indiaTVRes,
      globalTrendingRes,
    ] = await Promise.allSettled([
      tmdbService.getMoviesByGenres(genreIds, 1),
      tmdbService.getTVShowsByGenres(genreIds, 1),
      tmdbService.getIndianMoviesByGenres(genreIds, 1),
      tmdbService.getIndianTVShowsByGenres(genreIds, 1),
      tmdbService.getTrending('movie', 'day'),
    ]);

    const globalMoviesRaw  = globalMoviesRes.status  === 'fulfilled' ? (globalMoviesRes.value.results  || []) : [];
    const globalTVRaw      = globalTVRes.status      === 'fulfilled' ? (globalTVRes.value.results      || []) : [];
    const indiaMoviesRaw   = indiaMoviesRes.status   === 'fulfilled' ? (indiaMoviesRes.value.results   || []) : [];
    const indiaTVRaw       = indiaTVRes.status       === 'fulfilled' ? (indiaTVRes.value.results       || []) : [];
    const trendingMovies   = globalTrendingRes.status === 'fulfilled' ? (globalTrendingRes.value.results || []) : [];

    const genreSet = new Set(genreIds);

    // Global movies: genre discover + trending blended, then AI-reranked
    const globalMoviesPool = buildPool([...globalMoviesRaw, ...trendingMovies], genreSet, 30);

    // India movies: origin country IN, filtered by mood genres
    const indiaMoviesPool  = buildPool(indiaMoviesRaw,  genreSet, 20);

    // TV shows: no AI reranking — sort by vote_average
    const globalTVPool     = buildPool(globalTVRaw,  genreSet, 20);
    const indiaTVPool      = buildPool(indiaTVRaw,   genreSet, 20);

    // ── AI re-ranking on global movies only ───────────────────────────────────
    let sortedGlobalMovies: Movie[] = globalMoviesPool;
    let usedAIReranking = false;

    if (ENABLE_AI_RERANKING && globalMoviesPool.length > 0) {
      try {
        let movieDetailsMap: Map<number, MovieDetails> | undefined;
        try {
          movieDetailsMap = await Promise.race([
            tmdbService.getMoviesDetailsBatch(globalMoviesPool.map(m => m.id), 100),
            new Promise<Map<number, MovieDetails>>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 10000)
            ),
          ]) as Map<number, MovieDetails>;
        } catch { /* continue without details */ }

        const reranked = await Promise.race([
          aiService.reRankMoviesByMood(globalMoviesPool, moodType, movieDetailsMap),
          new Promise<Array<{ movie: Movie; score: number; reasoning: string }>>((_, reject) =>
            setTimeout(() => reject(new Error('AI re-ranking timeout')), AI_RERANKING_TIMEOUT)
          ),
        ]);

        sortedGlobalMovies = reranked.map(r => r.movie);
        usedAIReranking = true;
      } catch {
        // fall through to vote-average sort (already done in buildPool)
      }
    }

    const topGlobalMovies = sortedGlobalMovies.slice(0, 20);
    const topGlobalTV     = globalTVPool.slice(0, 20);
    const topIndiaMovies  = indiaMoviesPool.slice(0, 20);
    const topIndiaTV      = indiaTVPool.slice(0, 20);

    // ── Enrich all 4 pools with watch providers in parallel ───────────────────
    const [enrichedGlobalMovies, enrichedGlobalTV, enrichedIndiaMovies, enrichedIndiaTV] = await Promise.all([
      tmdbService.enrichMoviesWithWatchProviders(topGlobalMovies, 'IN'),
      tmdbService.enrichWithWatchProviders(topGlobalTV, 'IN'),
      tmdbService.enrichMoviesWithWatchProviders(topIndiaMovies, 'IN'),
      tmdbService.enrichWithWatchProviders(topIndiaTV, 'IN'),
    ]);

    const message = usedAIReranking
      ? `AI-curated picks for your ${moodConfig.label.toLowerCase()} mood — Indian & global movies and shows.`
      : `Curated for your ${moodConfig.label.toLowerCase()} mood — Indian & global movies and shows.`;

    const response = {
      success: true,
      mood: moodType,
      message,
      // India-specific
      indiaMovies: enrichedIndiaMovies,
      indiaTVShows: enrichedIndiaTV,
      // Global
      globalMovies: enrichedGlobalMovies,
      globalTVShows: enrichedGlobalTV,
      // Legacy field so existing clients don't break
      movies: enrichedGlobalMovies,
      count: enrichedGlobalMovies.length,
      ...(preferences?.length ? { preferences } : {}),
      ...(parsedMoodInfo ? { parsedMoodInfo } : {}),
    };

    const httpResponse = NextResponse.json(response, { status: 200 });
    if (isNew) {
      const cookie = setSessionTokenCookie(token);
      httpResponse.cookies.set(cookie.name, cookie.value, cookie.options);
      httpResponse.headers.set('x-session-token', token);
    }
    if (rateLimitResult.remaining !== undefined && rateLimitResult.reset !== undefined) {
      httpResponse.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      httpResponse.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    }
    return httpResponse;

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: process.env.NODE_ENV === 'development' ? error.issues : undefined },
        { status: 400 }
      );
    }
    const { message, status } = handleApiError(error, 'recommendations', 'Failed to generate recommendations');
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
