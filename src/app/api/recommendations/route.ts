import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/tmdb';
import { MOODS } from '@/config/moods';
import { MoodType } from '@/types/mood';
import { Movie } from '@/types/movie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mood, preferences } = body;

    // Validate mood
    if (!mood || typeof mood !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Mood is required and must be a string',
        },
        { status: 400 }
      );
    }

    // Validate mood type
    const validMoods: MoodType[] = [
      'happy',
      'sad',
      'excited',
      'relaxed',
      'romantic',
      'adventurous',
      'scared',
      'thoughtful',
      'energetic',
      'nostalgic',
    ];

    if (!validMoods.includes(mood as MoodType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid mood. Must be one of: ${validMoods.join(', ')}`,
        },
        { status: 400 }
      );
    }

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
      const trendingResponse = await tmdbService.getTrending('all', 'day');
      trendingMovies = trendingResponse.results || [];
    } catch (error) {
      console.error('Error fetching trending movies:', error);
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
    let allMovies = Array.from(movieMap.values());

    // Filter movies that match genre preferences
    const genreIds = new Set(moodConfig.genrePreferences);
    const relevantMovies = allMovies.filter((movie) =>
      movie.genre_ids?.some((id) => genreIds.has(id))
    );

    // If we have relevant movies, use them; otherwise use all movies
    const moviesToSort = relevantMovies.length > 0 ? relevantMovies : allMovies;

    // Sort by vote_average (descending) and then by vote_count (descending)
    const sortedMovies = moviesToSort.sort((a, b) => {
      // Primary sort: vote_average
      if (b.vote_average !== a.vote_average) {
        return b.vote_average - a.vote_average;
      }
      // Secondary sort: vote_count
      return b.vote_count - a.vote_count;
    });

    // Get top 20 movies
    const topMovies = sortedMovies.slice(0, 20);

    // Generate explanation message
    const message = preferences
      ? `Based on your ${moodConfig.label.toLowerCase()} mood and preferences, here are personalized recommendations.`
      : `Based on your ${moodConfig.label.toLowerCase()} mood, here are ${topMovies.length} carefully curated recommendations that match your current vibe.`;

    return NextResponse.json(
      {
        success: true,
        mood: moodType,
        movies: topMovies,
        message,
        count: topMovies.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating recommendations:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate recommendations',
      },
      { status: 500 }
    );
  }
}

