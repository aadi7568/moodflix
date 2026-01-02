import axios from 'axios';
import { MovieDetails, TMDBResponse } from '../types/movie';

class TMDBService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.themoviedb.org/3';

  private getApiKey(): string {
    if (!this.apiKey) {
      const apiKey = process.env.TMDB_API_KEY;
      if (!apiKey) {
        throw new Error('TMDB_API_KEY environment variable is not set');
      }
      // Trim whitespace that might have been accidentally added
      this.apiKey = apiKey.trim();
      
      // Validate API key format (should be a long string)
      if (this.apiKey.length < 10) {
        throw new Error('TMDB_API_KEY appears to be invalid (too short)');
      }
    }
    return this.apiKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, string | number>
  ): Promise<T> {
    try {
      const apiKey = this.getApiKey();
      
      // Trim the API key in case there's whitespace
      const trimmedApiKey = apiKey.trim();
      
      // Log API key status (first 4 chars only for security)
      console.log('Using TMDB API key:', trimmedApiKey.substring(0, 4) + '...' + trimmedApiKey.substring(trimmedApiKey.length - 4));
      
      const queryParams = {
        ...params,
        api_key: trimmedApiKey,
      };

      const fullUrl = `${this.baseUrl}${endpoint}`;
      console.log('Making request to:', fullUrl);
      console.log('Query params keys:', Object.keys(queryParams));

      const response = await axios.get<T>(fullUrl, {
        params: queryParams,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const errorMessage = error.response?.data 
          ? JSON.stringify(error.response.data)
          : error.message;
        
        console.error('TMDB API Error Details:', {
          status,
          statusText,
          message: errorMessage,
          url: error.config?.url,
          params: error.config?.params,
        });
        
        if (status === 401) {
          throw new Error(`TMDB API authentication failed (401). Please verify your TMDB_API_KEY is correct and has no extra spaces. Status: ${statusText}`);
        }
        
        throw new Error(
          `TMDB API error: ${status} - ${statusText || errorMessage}`
        );
      }
      throw new Error(`Failed to make request to TMDB API: ${error}`);
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
}

// Lazy initialization to avoid errors during build time
let tmdbServiceInstance: TMDBService | null = null;

export const getTmdbService = (): TMDBService => {
  if (!tmdbServiceInstance) {
    tmdbServiceInstance = new TMDBService();
  }
  return tmdbServiceInstance;
};

// Export singleton for backward compatibility
export const tmdbService = new Proxy({} as TMDBService, {
  get(_target, prop) {
    return getTmdbService()[prop as keyof TMDBService];
  },
});

