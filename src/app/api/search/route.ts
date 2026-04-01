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

/** Deduplicate movies by id, excluding a set of already-seen ids */
function dedupe(movies: Movie[], exclude: Set<number> = new Set()): Movie[] {
  const seen = new Set(exclude);
  return movies.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
}

/** Enrich a list with IMDb IDs + watch providers in one parallel pass */
async function enrich(movies: Movie[]): Promise<Movie[]> {
  if (movies.length === 0) return movies;
  const ids = movies.map(m => m.id);
  const [externalIds, withProviders] = await Promise.all([
    tmdbService.getMoviesExternalIdsBatch(ids, 100),
    tmdbService.enrichMoviesWithWatchProviders(movies, 'IN'),
  ]);
  return withProviders.map(movie => {
    const ext = externalIds.get(movie.id);
    const imdbId = ext?.imdb_id ?? null;
    return { ...movie, imdb_id: imdbId, imdb_url: buildImdbUrl(imdbId) };
  });
}

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimitMiddleware(request, 'search');
  if (!rateLimitResult.success) return rateLimitResult.response!;

  const { token, isNew } = await getOrCreateSessionToken(request);

  try {
    const query = request.nextUrl.searchParams.get('query');
    const validated = searchQuerySchema.parse({ query: query || '' });
    const sanitizedQuery = sanitizeSearchQuery(validated.query.trim(), 200);

    const intentResult = await searchInterpreter.classifyIntent(sanitizedQuery);
    const { intent } = intentResult;

    // ── Resolve reference movie for specific/similar intents ─────────────────
    let exactMatch: Movie | null = null;
    let referenceMovie: Movie | null = null;

    if (intent === 'specific_movie' || intent === 'similar_movies') {
      const searchTitle = intent === 'similar_movies' && intentResult.movieTitle
        ? intentResult.movieTitle
        : sanitizedQuery;
      const searchRes = await tmdbService.searchMovies(searchTitle, 1);
      const results = searchRes.results || [];
      if (results.length > 0) {
        referenceMovie = results[0];
        if (intent === 'specific_movie') exactMatch = referenceMovie;
      }
    }

    // ── Fetch all sections in parallel ───────────────────────────────────────
    const genreIds: number[] = referenceMovie?.genre_ids ?? [];

    const [
      similarRes,
      recommendationsRes,
      indiaTrendingRes,
      globalTrendingRes,
      genericSearchRes,
    ] = await Promise.allSettled([
      // Similar movies (TMDB keyword/genre matching)
      referenceMovie
        ? tmdbService.getSimilarMovies(referenceMovie.id, 1)
        : Promise.resolve(null),
      // TMDB curated recommendations (user-behaviour based — higher quality)
      referenceMovie
        ? tmdbService.getMovieRecommendations(referenceMovie.id, 1)
        : Promise.resolve(null),
      // India trending filtered to same genres as reference movie
      genreIds.length > 0
        ? tmdbService.getIndianMoviesByGenres(genreIds, 1)
        : tmdbService.getIndiaTrendingMovies(10),
      // Global trending filtered to same genres
      genreIds.length > 0
        ? tmdbService.getMoviesByGenres(genreIds, 1)
        : tmdbService.getGlobalTrending(10),
      // Raw search results (always fetch for generic intent fallback)
      tmdbService.searchMovies(sanitizedQuery, 1),
    ]);

    const similarRaw        = similarRes.status        === 'fulfilled' && similarRes.value        ? (similarRes.value.results        || []) : [];
    const recommendationsRaw = recommendationsRes.status === 'fulfilled' && recommendationsRes.value ? (recommendationsRes.value.results || []) : [];
    const indiaTrendingRaw  = indiaTrendingRes.status  === 'fulfilled'
      ? (Array.isArray(indiaTrendingRes.value) ? indiaTrendingRes.value : (indiaTrendingRes.value as {results?: Movie[]}).results || [])
      : [];
    const globalTrendingRaw = globalTrendingRes.status === 'fulfilled'
      ? (Array.isArray(globalTrendingRes.value)
          ? globalTrendingRes.value
          : ((globalTrendingRes.value as {movies?: Movie[], results?: Movie[]}).movies
             || (globalTrendingRes.value as {results?: Movie[]}).results
             || []))
      : [];
    const genericSearchRaw  = genericSearchRes.status  === 'fulfilled' ? (genericSearchRes.value.results || []) : [];

    // ── Build sections, excluding exactMatch from everything else ─────────────
    const excludeIds = new Set(exactMatch ? [exactMatch.id] : []);

    // Blend /similar + /recommendations, deduplicated, top 15
    const blendedSimilar = dedupe(
      [...recommendationsRaw, ...similarRaw],
      excludeIds
    ).slice(0, 15);

    const indiaTrending  = dedupe(indiaTrendingRaw, new Set([...Array.from(excludeIds), ...blendedSimilar.map(m => m.id)])).slice(0, 10);
    const globalTrending = dedupe(globalTrendingRaw, new Set([...Array.from(excludeIds), ...blendedSimilar.map(m => m.id), ...indiaTrending.map(m => m.id)])).slice(0, 10);
    const searchResults  = dedupe(genericSearchRaw, excludeIds).slice(0, 10);

    // ── Enrich all sections in parallel ──────────────────────────────────────
    const [
      enrichedExact,
      enrichedSimilar,
      enrichedIndia,
      enrichedGlobal,
      enrichedSearch,
    ] = await Promise.all([
      exactMatch ? enrich([exactMatch]) : Promise.resolve([]),
      enrich(blendedSimilar),
      enrich(indiaTrending),
      enrich(globalTrending),
      intent === 'generic_search' ? enrich(searchResults) : Promise.resolve(searchResults),
    ]);

    // ── Response ──────────────────────────────────────────────────────────────
    const httpResponse = NextResponse.json(
      {
        success: true,
        query: sanitizedQuery,
        intent,
        searchType: intent === 'similar_movies' ? 'similar' : intent === 'specific_movie' ? 'specific' : 'generic',
        exactMatch:     enrichedExact[0]   ?? null,
        similarMovies:  enrichedSimilar,
        trendingInIndia: enrichedIndia,
        globalTrending:  enrichedGlobal,
        searchResults:   enrichedSearch,
        // Legacy field so existing consumers don't break
        movies: enrichedExact[0]
          ? [enrichedExact[0], ...enrichedSimilar]
          : intent === 'generic_search'
          ? enrichedSearch
          : enrichedSimilar,
        count: enrichedSimilar.length,
      },
      { status: 200 }
    );

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
        { success: false, error: 'Invalid search query', movies: [] },
        { status: 400 }
      );
    }
    const { message, status } = handleApiError(error, 'search', 'Failed to process search request');
    return NextResponse.json({ success: false, error: message, movies: [] }, { status });
  }
}
