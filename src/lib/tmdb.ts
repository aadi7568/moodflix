import axios from 'axios';
import { MovieDetails, TMDBResponse } from '../types/movie';

class TMDBService {
  private apiKey: string;
  private baseUrl = 'https://api.themoviedb.org/3';

  constructor() {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      throw new Error('TMDB_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, string | number>
  ): Promise<T> {
    try {
      const queryParams = {
        ...params,
        api_key: this.apiKey,
      };

      const response = await axios.get<T>(`${this.baseUrl}${endpoint}`, {
        params: queryParams,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `TMDB API error: ${error.response?.status} - ${error.response?.statusText || error.message}`
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

export const tmdbService = new TMDBService();

