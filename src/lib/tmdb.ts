import axios from 'axios';
import { MovieDetails, TMDBResponse } from '../types/movie';

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

