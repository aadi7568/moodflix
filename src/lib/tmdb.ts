import axios from 'axios';
import { Movie, MovieDetails, TMDBResponse } from '../types/movie';

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
   * Get trending content in India using Discover endpoint
   * @param mediaType - 'movie' or 'tv'
   * @param page - Page number (default: 1)
   * @param limit - Limit number of results (optional)
   * @returns TMDB response with trending content
   */
  async getTrendingInIndia(
    mediaType: 'movie' | 'tv',
    page: number = 1,
    limit?: number
  ): Promise<TMDBResponse> {
    const response = await this.makeRequest<TMDBResponse>(`/discover/${mediaType}`, {
      region: 'IN',
      sort_by: 'popularity.desc',
      page,
    });

    // Apply limit if specified
    if (limit && response.results) {
      response.results = response.results.slice(0, limit);
    }

    return response;
  }

  /**
   * Get top 10 trending movies and TV shows in India
   * @returns Object with separate arrays for movies and TV shows, each limited to 10 items
   */
  async getTop10TrendingInIndia(): Promise<{ movies: Movie[]; tvShows: Movie[] }> {
    const [moviesResponse, tvShowsResponse] = await Promise.all([
      this.getTrendingInIndia('movie', 1, 10),
      this.getTrendingInIndia('tv', 1, 10),
    ]);

    return {
      movies: moviesResponse.results || [],
      tvShows: tvShowsResponse.results || [],
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

