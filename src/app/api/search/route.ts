import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/tmdb';
import { Movie } from '@/types/movie';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Return results
    return NextResponse.json(
      {
        success: true,
        movies,
        count: movies.length,
        query: trimmedQuery,
      },
      { status: 200 }
    );
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

