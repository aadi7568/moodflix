import axios from 'axios';
import { Movie, MovieDetails, TMDBResponse, WatchProviders, WatchProvider } from '../types/movie';

class TMDBService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.themoviedb.org/3';

  private getApiKey(): string {
    if (!this.apiKey) {
      const apiKey = process.env.TMDB_API_KEY;
      
      if (!apiKey) {
        console.error('TMDB_API_KEY environment variable is not set');
        throw new Error('TMDB_API_KEY environment variable is not set');
      }
      
      // Trim whitespace that might have been accidentally added
      const trimmedKey = typeof apiKey === 'string' ? apiKey.trim() : String(apiKey).trim();
      
      // Validate API key format
      if (!trimmedKey || trimmedKey.length < 10) {
        console.error('TMDB_API_KEY appears to be invalid');
        throw new Error('TMDB_API_KEY is invalid');
      }
      
      this.apiKey = trimmedKey;
    }
    return this.apiKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, string | number>
  ): Promise<T> {
    try {
      const apiKey = this.getApiKey();
      
      const queryParams = {
        ...params,
        api_key: apiKey,
      };

      const response = await axios.get<T>(`${this.baseUrl}${endpoint}`, {
        params: queryParams,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        
        console.error('TMDB API Error:', {
          status,
          statusText,
          endpoint: `${this.baseUrl}${endpoint}`,
          message: error.message,
        });
        
        if (status === 401) {
          throw new Error('TMDB API authentication failed');
        }
        
        if (status) {
          throw new Error(`TMDB API error: ${status} ${statusText || ''}`);
        }
        
        throw new Error('TMDB API request failed');
      }
      
      console.error('TMDB API Request Error:', error);
      throw new Error('Failed to make request to TMDB API');
    }
  }

  async getTrending(
    mediaType: 'movie' | 'tv' | 'all' = 'all',
    timeWindow: 'day' | 'week' = 'day'
  ): Promise<TMDBResponse> {
    return this.makeRequest<TMDBResponse>(
      `/trending/${mediaType}/${timeWindow}`
    );
  }

  async getMoviesByGenres(
    genreIds: number[],
    page = 1
  ): Promise<TMDBResponse> {
    return this.makeRequest<TMDBResponse>('/discover/movie', {
      with_genres: genreIds.join(','),
      sort_by: 'popularity.desc',
      page,
    });
  }

  async searchMovies(query: string, page = 1): Promise<TMDBResponse> {
    return this.makeRequest<TMDBResponse>('/search/movie', {
      query,
      page,
    });
  }

  async searchTVShows(query: string, page = 1): Promise<TMDBResponse> {
    return this.makeRequest<TMDBResponse>('/search/tv', {
      query,
      page,
    });
  }

  async getMovieDetails(movieId: number): Promise<MovieDetails> {
    return this.makeRequest<MovieDetails>(`/movie/${movieId}`);
  }

  async getMoviesDetailsBatch(
    movieIds: number[],
    delayMs: number = 100
  ): Promise<Map<number, MovieDetails>> {
    const results = new Map<number, MovieDetails>();
    
    // Process in smaller batches to respect rate limits
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < movieIds.length; i += BATCH_SIZE) {
      const batch = movieIds.slice(i, i + BATCH_SIZE);
      
      try {
        // Fetch details for batch in parallel
        const batchPromises = batch.map(async (movieId) => {
          try {
            const details = await this.getMovieDetails(movieId);
            return { movieId, details };
          } catch (error) {
            console.error(`Error fetching details for movie ${movieId}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach((result) => {
          if (result) {
            results.set(result.movieId, result.details);
          }
        });

        // Add delay between batches to respect rate limits
        if (i + BATCH_SIZE < movieIds.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`Error in batch details fetch:`, error);
        // Continue with next batch
      }
    }

    return results;
  }

  /**
   * Get similar movies for a given movie ID
   * @param movieId - The TMDB movie ID
   * @param page - Page number (default: 1)
   * @returns TMDB response with similar movies
   */
  async getSimilarMovies(movieId: number, page: number = 1): Promise<TMDBResponse> {
    return this.makeRequest<TMDBResponse>(`/movie/${movieId}/similar`, {
      page,
    });
  }

  /**
   * Get external IDs (including IMDb ID) for a movie
   * @param movieId - The TMDB movie ID
   * @returns External IDs object with imdb_id and other IDs
   */
  async getMovieExternalIds(movieId: number): Promise<{ imdb_id: string | null; [key: string]: unknown }> {
    return this.makeRequest<{ imdb_id: string | null; [key: string]: unknown }>(`/movie/${movieId}/external_ids`);
  }

  /**
   * Batch fetch external IDs for multiple movies
   * @param movieIds - Array of movie IDs
   * @param delayMs - Delay between batches in milliseconds (default: 100)
   * @returns Map of movie ID to external IDs object
   */
  async getMoviesExternalIdsBatch(
    movieIds: number[],
    delayMs: number = 100
  ): Promise<Map<number, { imdb_id: string | null }>> {
    const results = new Map<number, { imdb_id: string | null }>();
    
    // Process in smaller batches to respect rate limits
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < movieIds.length; i += BATCH_SIZE) {
      const batch = movieIds.slice(i, i + BATCH_SIZE);
      
      try {
        // Fetch external IDs for batch in parallel
        const batchPromises = batch.map(async (movieId) => {
          try {
            const externalIds = await this.getMovieExternalIds(movieId);
            return { movieId, externalIds: { imdb_id: externalIds.imdb_id || null } };
          } catch (error) {
            console.error(`Error fetching external IDs for movie ${movieId}:`, error);
            return { movieId, externalIds: { imdb_id: null } };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach((result) => {
          results.set(result.movieId, result.externalIds);
        });

        // Add delay between batches to respect rate limits
        if (i + BATCH_SIZE < movieIds.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`Error in batch external IDs fetch:`, error);
        // Continue with next batch, set null for failed ones
        batch.forEach(movieId => {
          if (!results.has(movieId)) {
            results.set(movieId, { imdb_id: null });
          }
        });
      }
    }

    return results;
  }

  /**
   * Get movies currently playing in theaters for a specific region
   * @param region - ISO 3166-1 alpha-2 country code (default: 'IN' for India)
   * @param page - Page number (default: 1)
   * @returns TMDB response with now playing movies
   */
  async getNowPlaying(region: string = 'IN', page: number = 1): Promise<TMDBResponse> {
    return this.makeRequest<TMDBResponse>('/movie/now_playing', {
      region,
      page,
    });
  }

  /**
   * Get upcoming movies for a specific region
   * @param region - ISO 3166-1 alpha-2 country code (default: 'IN' for India)
   * @param page - Page number (default: 1)
   * @returns TMDB response with upcoming movies
   */
  async getUpcoming(region: string = 'IN', page: number = 1): Promise<TMDBResponse> {
    return this.makeRequest<TMDBResponse>('/movie/upcoming', {
      region,
      page,
    });
  }

  /**
   * Get watch providers for a movie in a specific region
   * @param movieId - The TMDB movie ID
   * @param region - ISO 3166-1 alpha-2 country code (default: 'IN' for India)
   * @returns Watch providers object with flatrate, rent, buy arrays
   */
  async getWatchProviders(
    movieId: number,
    region: string = 'IN'
  ): Promise<{
    id: number;
    results: {
      IN?: {
        link: string;
        flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string | null; display_priority: number }>;
        rent?: Array<{ provider_id: number; provider_name: string; logo_path: string | null; display_priority: number }>;
        buy?: Array<{ provider_id: number; provider_name: string; logo_path: string | null; display_priority: number }>;
      };
    };
  }> {
    return this.makeRequest<{
      id: number;
      results: {
        IN?: {
          link: string;
          flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string | null; display_priority: number }>;
          rent?: Array<{ provider_id: number; provider_name: string; logo_path: string | null; display_priority: number }>;
          buy?: Array<{ provider_id: number; provider_name: string; logo_path: string | null; display_priority: number }>;
        };
      };
    }>(`/movie/${movieId}/watch/providers`, {
      watch_region: region,
    });
  }

  /**
   * Batch fetch full watch providers data for multiple movies
   * @param movieIds - Array of movie IDs
   * @param region - ISO 3166-1 alpha-2 country code (default: 'IN')
   * @param delayMs - Delay between batches in milliseconds (default: 100)
   * @returns Map of movie ID to watch providers data
   */
  async getMoviesWatchProvidersFullBatch(
    movieIds: number[],
    region: string = 'IN',
    delayMs: number = 100
  ): Promise<Map<number, { flatrate?: WatchProvider[]; rent?: WatchProvider[]; buy?: WatchProvider[] }>> {
    const results = new Map<number, { flatrate?: WatchProvider[]; rent?: WatchProvider[]; buy?: WatchProvider[] }>();
    
    // Process in smaller batches to respect rate limits
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < movieIds.length; i += BATCH_SIZE) {
      const batch = movieIds.slice(i, i + BATCH_SIZE);
      
      try {
        // Fetch watch providers for batch in parallel
        const batchPromises = batch.map(async (movieId) => {
          try {
            const providers = await this.getWatchProviders(movieId, region);
            const regionProviders = providers.results[region as keyof typeof providers.results];
            return { 
              movieId, 
              providers: regionProviders ? {
                flatrate: regionProviders.flatrate || [],
                rent: regionProviders.rent || [],
                buy: regionProviders.buy || [],
              } : { flatrate: [], rent: [], buy: [] }
            };
          } catch (error) {
            console.error(`Error fetching watch providers for movie ${movieId}:`, error);
            return { movieId, providers: { flatrate: [], rent: [], buy: [] } };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach((result) => {
          results.set(result.movieId, result.providers);
        });

        // Add delay between batches to respect rate limits
        if (i + BATCH_SIZE < movieIds.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`Error in batch watch providers fetch:`, error);
        // Continue with next batch, set empty for failed ones
        batch.forEach(movieId => {
          if (!results.has(movieId)) {
            results.set(movieId, { flatrate: [], rent: [], buy: [] });
          }
        });
      }
    }
    
    return results;
  }

  /**
   * Batch fetch watch providers for multiple movies (returns boolean only)
   * @param movieIds - Array of movie IDs
   * @param region - ISO 3166-1 alpha-2 country code (default: 'IN')
   * @param delayMs - Delay between batches in milliseconds (default: 100)
   * @returns Map of movie ID to watch providers (true if available in region, false otherwise)
   */
  async getMoviesWatchProvidersBatch(
    movieIds: number[],
    region: string = 'IN',
    delayMs: number = 100
  ): Promise<Map<number, boolean>> {
    const results = new Map<number, boolean>();
    
    // Process in smaller batches to respect rate limits
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < movieIds.length; i += BATCH_SIZE) {
      const batch = movieIds.slice(i, i + BATCH_SIZE);
      
      try {
        // Fetch watch providers for batch in parallel
        const batchPromises = batch.map(async (movieId) => {
          try {
            const providers = await this.getWatchProviders(movieId, region);
            // Check if movie has any providers (flatrate, rent, or buy) in India
            const indiaProviders = providers.results[region as keyof typeof providers.results];
            const isAvailable = !!(
              indiaProviders?.flatrate?.length ||
              indiaProviders?.rent?.length ||
              indiaProviders?.buy?.length
            );
            return { movieId, isAvailable };
          } catch (error) {
            console.error(`Error fetching watch providers for movie ${movieId}:`, error);
            return { movieId, isAvailable: false };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach((result) => {
          results.set(result.movieId, result.isAvailable);
        });

        // Add delay between batches to respect rate limits
        if (i + BATCH_SIZE < movieIds.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`Error in batch watch providers fetch:`, error);
        // Continue with next batch, set false for failed ones
        batch.forEach(movieId => {
          if (!results.has(movieId)) {
            results.set(movieId, false);
          }
        });
      }
    }

    return results;
  }

  /**
   * Enrich movies with watch providers data
   * @param movies - Array of movies to enrich
   * @param region - ISO 3166-1 alpha-2 country code (default: 'IN')
   * @returns Array of movies with watch_providers field populated
   */
  async enrichMoviesWithWatchProviders(
    movies: Movie[],
    region: string = 'IN'
  ): Promise<Movie[]> {
    if (movies.length === 0) {
      return movies;
    }

    const movieIds = movies.map(m => m.id);
    const providersMap = await this.getMoviesWatchProvidersFullBatch(movieIds, region);

    return movies.map(movie => {
      const providers = providersMap.get(movie.id);
      if (providers && (providers.flatrate?.length || providers.rent?.length || providers.buy?.length)) {
        return {
          ...movie,
          watch_providers: {
            flatrate: providers.flatrate || [],
            rent: providers.rent || [],
            buy: providers.buy || [],
          } as WatchProviders,
        };
      }
      return movie;
    });
  }

  /**
   * Get Indian language movies (Hindi, Tamil, Telugu)
   * @param page - Page number (default: 1)
   * @param limit - Limit number of results (optional)
   * @returns TMDB response with Indian language movies
   */
  async getIndianLanguageMovies(
    page: number = 1,
    limit?: number
  ): Promise<TMDBResponse> {
    // Fetch movies in Hindi, Tamil, and Telugu
    // Using OR logic: fetch each language separately and combine, or use with_original_language with comma
    // Note: TMDB supports comma-separated values for with_original_language
    const response = await this.makeRequest<TMDBResponse>('/discover/movie', {
      region: 'IN',
      with_original_language: 'hi,ta,te,ml,kn,bn,mr,pa', // Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Punjabi
      sort_by: 'popularity.desc',
      'release_date.gte': new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last year
      page,
    });

    // Apply limit if specified
    if (limit && response.results) {
      response.results = response.results.slice(0, limit);
    }

    return response;
  }

  /**
   * Get hybrid trending movies for India
   * Combines global trending + now playing in India + Indian language movies, filtered by India availability
   * @param limit - Number of results to return (default: 10)
   * @returns Array of movies ranked by trending score and availability
   */
  async getHybridTrendingForIndia(limit: number = 10): Promise<Movie[]> {
    try {
      // Fetch all sources in parallel
      const [globalTrending, nowPlayingResponse, indianMoviesResponse] = await Promise.all([
        this.getTrending('movie', 'week'),
        this.getNowPlaying('IN', 1),
        this.getIndianLanguageMovies(1, 20), // Get up to 20 Indian movies
      ]);

      const trendingMovies = globalTrending.results || [];
      const nowPlayingMovies = nowPlayingResponse.results || [];
      const indianMovies = indianMoviesResponse.results || [];

      // Combine and deduplicate by movie ID
      const movieMap = new Map<number, { 
        movie: Movie; 
        source: 'trending' | 'now_playing' | 'indian'; 
        index: number;
        isIndianLanguage: boolean;
      }>();
      
      // Add trending movies with their index (for ranking)
      trendingMovies.forEach((movie, index) => {
        if (!movieMap.has(movie.id)) {
          movieMap.set(movie.id, { 
            movie, 
            source: 'trending', 
            index,
            isIndianLanguage: false,
          });
        }
      });

      // Add now playing movies
      nowPlayingMovies.forEach((movie, index) => {
        if (movieMap.has(movie.id)) {
          // Already in trending, keep trending as source
          const existing = movieMap.get(movie.id)!;
          movieMap.set(movie.id, { ...existing });
        } else {
          movieMap.set(movie.id, { 
            movie, 
            source: 'now_playing', 
            index,
            isIndianLanguage: false,
          });
        }
      });

      // Add Indian language movies (mark as Indian)
      indianMovies.forEach((movie, index) => {
        if (movieMap.has(movie.id)) {
          // Already exists, mark as Indian language
          const existing = movieMap.get(movie.id)!;
          movieMap.set(movie.id, { 
            ...existing, 
            isIndianLanguage: true,
            // If it's not already from trending, prioritize Indian source
            source: existing.source === 'trending' ? existing.source : 'indian',
          });
        } else {
          movieMap.set(movie.id, { 
            movie, 
            source: 'indian', 
            index,
            isIndianLanguage: true,
          });
        }
      });

      // Get all unique movie IDs
      const allMovieIds = Array.from(movieMap.keys());

      // Check watch providers for India availability (in batches)
      const availabilityMap = await this.getMoviesWatchProvidersBatch(allMovieIds, 'IN');

      // Score and rank movies
      const scoredMovies = Array.from(movieMap.values()).map(({ movie, source, index, isIndianLanguage }) => {
        const isAvailable = availabilityMap.get(movie.id) || false;
        
        // Scoring:
        // - Trending movies get higher base score (100 - index)
        // - Indian language movies get high base score (90 - index) - prioritize Indian content
        // - Now playing gets medium score (50 - index)
        // - Availability in India adds bonus (50 points)
        // - Indian language bonus (20 points) - bonus for Indian movies
        // - Recency bonus (newer releases get +10 to +30 points)
        let score = 0;
        
        if (source === 'trending') {
          score = 100 - index; // Trending position matters
        } else if (source === 'indian') {
          score = 90 - index; // Indian movies get high priority
        } else {
          score = 50 - index; // Now playing position matters less
        }
        
        // Indian language bonus
        if (isIndianLanguage) {
          score += 20; // Bonus for Indian movies (Hindi, Tamil, Telugu)
        }
        
        if (isAvailable) {
          score += 50; // Big bonus for India availability
        }
        
        // Recency bonus (movies released in last 90 days get bonus)
        const releaseDate = movie.release_date ? new Date(movie.release_date) : null;
        if (releaseDate) {
          const daysSinceRelease = (Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceRelease <= 90) {
            score += 30 - Math.floor(daysSinceRelease / 3); // Up to 30 points for recent releases
          }
        }
        
        return { movie, score, isAvailable, source, isIndianLanguage };
      });

      // Sort by score (descending), then by availability, then by release date
      scoredMovies.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // Tiebreaker: prefer available in India
        if (b.isAvailable !== a.isAvailable) {
          return b.isAvailable ? 1 : -1;
        }
        // Final tiebreaker: newer release date
        const dateA = a.movie.release_date ? new Date(a.movie.release_date).getTime() : 0;
        const dateB = b.movie.release_date ? new Date(b.movie.release_date).getTime() : 0;
        return dateB - dateA;
      });

      // Return top N movies
      return scoredMovies.slice(0, limit).map(item => item.movie);
    } catch (error) {
      console.error('Error in hybrid trending:', error);
      // Fallback to just global trending if hybrid fails
      try {
        const fallback = await this.getTrending('movie', 'week');
        return (fallback.results || []).slice(0, limit);
      } catch (fallbackError) {
        console.error('Fallback trending also failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Get Indian language TV shows (Hindi, Tamil, Telugu)
   * @param page - Page number (default: 1)
   * @param limit - Limit number of results (optional)
   * @returns TMDB response with Indian language TV shows
   */
  async getIndianLanguageTVShows(
    page: number = 1,
    limit?: number
  ): Promise<TMDBResponse> {
    // Fetch TV shows in Hindi, Tamil, and Telugu
    const response = await this.makeRequest<TMDBResponse>('/discover/tv', {
      region: 'IN',
      with_original_language: 'hi,ta,te,ml,kn,bn,mr,pa', // Hindi, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Punjabi
      sort_by: 'popularity.desc',
      'first_air_date.gte': new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last year
      page,
    });

    // Apply limit if specified
    if (limit && response.results) {
      response.results = response.results.slice(0, limit);
    }

    return response;
  }

  /**
   * Get hybrid trending TV shows for India
   * Similar to movies but for TV shows
   * @param limit - Number of results to return (default: 10)
   * @returns Array of TV shows ranked by trending score
   */
  async getHybridTrendingTVForIndia(limit: number = 10): Promise<Movie[]> {
    try {
      // Fetch all sources in parallel
      const [globalTrending, onTheAirResponse, indianShowsResponse] = await Promise.all([
        this.getTrending('tv', 'week'),
        this.makeRequest<TMDBResponse>('/tv/on_the_air', {
          region: 'IN',
          page: 1,
        }).catch(() => ({ 
          results: [], 
          page: 1, 
          total_pages: 0, 
          total_results: 0 
        } as TMDBResponse)),
        this.getIndianLanguageTVShows(1, 20), // Get up to 20 Indian TV shows
      ]);

      const trendingShows = globalTrending.results || [];
      const onTheAirShows = onTheAirResponse.results || [];
      const indianShows = indianShowsResponse.results || [];

      // Combine and deduplicate
      const showMap = new Map<number, { 
        show: Movie; 
        source: 'trending' | 'on_the_air' | 'indian'; 
        index: number;
        isIndianLanguage: boolean;
      }>();
      
      trendingShows.forEach((show, index) => {
        if (!showMap.has(show.id)) {
          showMap.set(show.id, { 
            show, 
            source: 'trending', 
            index,
            isIndianLanguage: false,
          });
        }
      });

      onTheAirShows.forEach((show, index) => {
        if (showMap.has(show.id)) {
          const existing = showMap.get(show.id)!;
          showMap.set(show.id, { ...existing });
        } else {
          showMap.set(show.id, { 
            show, 
            source: 'on_the_air', 
            index,
            isIndianLanguage: false,
          });
        }
      });

      // Add Indian language TV shows
      indianShows.forEach((show, index) => {
        if (showMap.has(show.id)) {
          const existing = showMap.get(show.id)!;
          showMap.set(show.id, { 
            ...existing, 
            isIndianLanguage: true,
            source: existing.source === 'trending' ? existing.source : 'indian',
          });
        } else {
          showMap.set(show.id, { 
            show, 
            source: 'indian', 
            index,
            isIndianLanguage: true,
          });
        }
      });

      // Score and rank (similar to movies)
      const scoredShows = Array.from(showMap.values()).map(({ show, source, index, isIndianLanguage }) => {
        let score = 0;
        
        if (source === 'trending') {
          score = 100 - index;
        } else if (source === 'indian') {
          score = 90 - index; // Indian shows get high priority
        } else {
          score = 50 - index;
        }
        
        // Indian language bonus
        if (isIndianLanguage) {
          score += 20; // Bonus for Indian TV shows (Hindi, Tamil, Telugu)
        }
        
        // Recency bonus for TV shows
        const airDate = show.first_air_date ? new Date(show.first_air_date) : null;
        if (airDate) {
          const daysSinceAir = (Date.now() - airDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceAir <= 90) {
            score += 30 - Math.floor(daysSinceAir / 3);
          }
        }
        
        return { show, score, isIndianLanguage };
      });

      // Sort by score
      scoredShows.sort((a, b) => b.score - a.score);

      return scoredShows.slice(0, limit).map(item => item.show);
    } catch (error) {
      console.error('Error in hybrid trending TV:', error);
      // Fallback to just global trending
      try {
        const fallback = await this.getTrending('tv', 'week');
        return (fallback.results || []).slice(0, limit);
      } catch (fallbackError) {
        console.error('Fallback trending TV also failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Get top 10 hybrid trending movies and TV shows for India
   * @returns Object with separate arrays for movies and TV shows, each limited to 10 items
   */
  async getTop10HybridTrendingForIndia(): Promise<{ movies: Movie[]; tvShows: Movie[] }> {
    const [movies, tvShows] = await Promise.all([
      this.getHybridTrendingForIndia(10),
      this.getHybridTrendingTVForIndia(10),
    ]);

    return {
      movies,
      tvShows,
    };
  }

  /**
   * Get trending movies specifically for India using only India-centric sources.
   * Does NOT mix with global trending — scores Indian sources against each other only.
   * Sources: now playing in India + Indian language discover + upcoming in India
   * @param limit - Number of results to return (default: 10)
   * @returns Array of movies genuinely popular/current in India
   */
  async getIndiaTrendingMovies(limit: number = 10): Promise<Movie[]> {
    try {
      const [nowPlayingRes, indianLangRes, upcomingRes] = await Promise.all([
        this.getNowPlaying('IN', 1),
        this.getIndianLanguageMovies(1, 30),
        this.getUpcoming('IN', 1),
      ]);

      const nowPlaying = nowPlayingRes.results || [];
      const indianLang = indianLangRes.results || [];
      const upcoming = upcomingRes.results || [];

      // Deduplicate by ID, tracking best source and index
      const movieMap = new Map<number, { movie: Movie; source: 'now_playing' | 'indian_lang' | 'upcoming'; index: number }>();

      nowPlaying.forEach((movie, index) => {
        if (!movieMap.has(movie.id)) {
          movieMap.set(movie.id, { movie, source: 'now_playing', index });
        }
      });

      indianLang.forEach((movie, index) => {
        if (!movieMap.has(movie.id)) {
          movieMap.set(movie.id, { movie, source: 'indian_lang', index });
        } else {
          // Upgrade to now_playing source if that's what we have, keep better source
          const existing = movieMap.get(movie.id)!;
          if (existing.source !== 'now_playing') {
            movieMap.set(movie.id, { movie, source: 'indian_lang', index });
          }
        }
      });

      upcoming.forEach((movie, index) => {
        if (!movieMap.has(movie.id)) {
          movieMap.set(movie.id, { movie, source: 'upcoming', index });
        }
      });

      // Score and rank within India-only pool
      const today = new Date();
      const scored = Array.from(movieMap.values()).map(({ movie, source, index }) => {
        let score = 0;

        if (source === 'now_playing') score = 100 - index;       // Currently in theaters = highest priority
        else if (source === 'indian_lang') score = 80 - index;   // Popular Indian language content
        else score = 40 - index;                                  // Upcoming

        // Recency bonus (up to +30 for very new releases)
        if (movie.release_date) {
          const daysSince = (today.getTime() - new Date(movie.release_date).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince >= 0 && daysSince <= 90) {
            score += Math.max(0, 30 - Math.floor(daysSince / 3));
          }
        }

        // Popularity bonus — use TMDB's vote_average as a small quality signal
        if (movie.vote_average && movie.vote_average > 0) {
          score += Math.min(10, movie.vote_average);
        }

        return { movie, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map(item => item.movie);
    } catch (error) {
      console.error('Error in getIndiaTrendingMovies:', error);
      // Fallback: just return popular Indian language movies
      try {
        const fallback = await this.getIndianLanguageMovies(1, limit);
        return (fallback.results || []).slice(0, limit);
      } catch {
        return [];
      }
    }
  }

  /**
   * Get trending TV shows specifically for India using only India-centric sources.
   * Does NOT mix with global trending.
   * @param limit - Number of results to return (default: 10)
   * @returns Array of TV shows genuinely popular in India
   */
  async getIndiaTrendingTVShows(limit: number = 10): Promise<Movie[]> {
    try {
      const [onAirRes, indianLangRes] = await Promise.all([
        this.makeRequest<TMDBResponse>('/tv/on_the_air', { region: 'IN', page: 1 }),
        this.getIndianLanguageTVShows(1, 30),
      ]);

      const onAir = (onAirRes.results || []).map(s => ({ ...s, media_type: 'tv' as const }));
      const indianLang = (indianLangRes.results || []).map(s => ({ ...s, media_type: 'tv' as const }));

      const showMap = new Map<number, { show: Movie; source: 'on_air' | 'indian_lang'; index: number }>();

      onAir.forEach((show, index) => {
        if (!showMap.has(show.id)) {
          showMap.set(show.id, { show, source: 'on_air', index });
        }
      });

      indianLang.forEach((show, index) => {
        if (!showMap.has(show.id)) {
          showMap.set(show.id, { show, source: 'indian_lang', index });
        }
      });

      const today = new Date();
      const scored = Array.from(showMap.values()).map(({ show, source, index }) => {
        let score = source === 'on_air' ? 100 - index : 80 - index;

        if (show.first_air_date) {
          const daysSince = (today.getTime() - new Date(show.first_air_date).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince >= 0 && daysSince <= 90) {
            score += Math.max(0, 30 - Math.floor(daysSince / 3));
          }
        }

        if (show.vote_average && show.vote_average > 0) {
          score += Math.min(10, show.vote_average);
        }

        return { show, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit).map(item => item.show);
    } catch (error) {
      console.error('Error in getIndiaTrendingTVShows:', error);
      try {
        const fallback = await this.getIndianLanguageTVShows(1, limit);
        return (fallback.results || []).slice(0, limit).map(s => ({ ...s, media_type: 'tv' as const }));
      } catch {
        return [];
      }
    }
  }

  /**
   * Get global trending movies and TV shows (not India-specific)
   * Used for the "Trending Globally" carousel
   */
  async getGlobalTrending(limit: number = 10): Promise<{ movies: Movie[]; tvShows: Movie[] }> {
    const [moviesRes, tvRes] = await Promise.all([
      this.getTrending('movie', 'week'),
      this.getTrending('tv', 'week'),
    ]);
    return {
      movies: (moviesRes.results || []).slice(0, limit),
      tvShows: (tvRes.results || []).slice(0, limit),
    };
  }
}

// Lazy initialization to avoid errors during build time
let tmdbServiceInstance: TMDBService | null = null;

export const getTmdbService = (): TMDBService => {
  if (!tmdbServiceInstance) {
    tmdbServiceInstance = new TMDBService();
  }
  return tmdbServiceInstance;
};

// Export singleton instance directly (simpler and more reliable than Proxy)
export const tmdbService = (() => {
  // Create instance on first access
  if (!tmdbServiceInstance) {
    tmdbServiceInstance = new TMDBService();
  }
  return tmdbServiceInstance;
})();

