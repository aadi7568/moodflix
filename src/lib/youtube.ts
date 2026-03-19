import axios from 'axios';
import { Movie } from '../types/movie';
import { getTmdbService } from './tmdb';

interface YouTubeVideoSnippet {
  title: string;
  channelTitle: string;
  description: string;
  publishedAt: string;
}

interface YouTubeVideo {
  id: string;
  snippet: YouTubeVideoSnippet;
}

interface YouTubeResponse {
  items: YouTubeVideo[];
}

interface CachedTrending {
  movies: Movie[];
  tvShows: Movie[];
  fetchedAt: number;
}

// Patterns to strip from YouTube video titles to extract the movie/show name
const TITLE_NOISE_PATTERNS = [
  /[-|–—]\s*(official\s+)?(trailer|teaser|song|video|lyric\s+video|audio|promo|clip|scene|making|behind\s+the\s+scenes|bts|review|reaction|interview|preview)\b.*/i,
  /\s*[|([].*?(trailer|teaser|song|video|lyric|audio|promo|clip|scene|making|bts|review|reaction|interview|hindi|dubbed|4k|hd|full\s+movie|official)[^\])*[\])]*/i,
  /\s*(ft\.|feat\.|featuring)\s+.*/i,
  /\s*#\w+/g,
  /\s{2,}/g,
];

function extractMovieTitle(youtubeTitle: string): string | null {
  let title = youtubeTitle.trim();

  // Skip non-movie content
  const skipPatterns = [/\breact(ion)?\b/i, /\bvlog\b/i, /\bshort\s+film\b/i, /\bweb\s+series\b/i];
  if (skipPatterns.some(p => p.test(title))) return null;

  // Apply noise stripping
  for (const pattern of TITLE_NOISE_PATTERNS) {
    title = title.replace(pattern, '');
  }

  title = title.trim().replace(/[|–—-]+$/, '').trim();

  // Reject if too short or looks like a channel name
  if (title.length < 3 || title.length > 80) return null;

  return title;
}

class YouTubeService {
  private cache: CachedTrending | null = null;
  // Cache for 3 hours — YouTube trending shifts slowly
  private readonly CACHE_TTL_MS = 3 * 60 * 60 * 1000;

  private getApiKey(): string | null {
    // Read lazily so Next.js serverless env vars are available at call time
    return process.env.YOUTUBE_API_KEY ?? null;
  }

  private isAvailable(): boolean {
    return !!this.getApiKey();
  }

  /**
   * Fetch trending Film & Animation videos in India from YouTube.
   * Returns up to maxResults video titles.
   */
  private async fetchTrendingVideoTitles(maxResults = 20): Promise<string[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) return [];

    const response = await axios.get<YouTubeResponse>(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          part: 'snippet',
          chart: 'mostPopular',
          regionCode: 'IN',
          videoCategoryId: '1', // Film & Animation
          maxResults,
          key: apiKey,
        },
        timeout: 8000,
      }
    );

    return response.data.items.map(v => v.snippet.title);
  }

  /**
   * Given a list of raw YouTube titles, extract movie names and search TMDB
   * for each, deduplicating by TMDB ID.
   */
  private async resolveTitlesToMovies(titles: string[]): Promise<{ movies: Movie[]; tvShows: Movie[] }> {
    const tmdb = getTmdbService();
    const movieMap = new Map<number, Movie>();
    const tvMap = new Map<number, Movie>();
    const INDIAN_LANGUAGES = new Set(['hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr', 'pa']);

    const searches = titles
      .map(extractMovieTitle)
      .filter((t): t is string => t !== null);

    // Run searches in parallel batches of 5 to avoid TMDB rate limits
    const BATCH = 5;
    for (let i = 0; i < searches.length; i += BATCH) {
      const batch = searches.slice(i, i + BATCH);
      await Promise.allSettled(
        batch.map(async (query) => {
          try {
            const [movieRes, tvRes] = await Promise.allSettled([
              tmdb.searchMovies(query, 1),
              tmdb.searchTVShows(query, 1),
            ]);

            if (movieRes.status === 'fulfilled' && movieRes.value?.results?.length) {
              // Prefer Indian-language results; fall back to any result if none found
              const results = movieRes.value.results;
              const top = results.find(r => r.original_language && INDIAN_LANGUAGES.has(r.original_language))
                ?? results[0];
              if (top && !movieMap.has(top.id)) {
                movieMap.set(top.id, { ...top, media_type: 'movie' });
              }
            }

            if (tvRes.status === 'fulfilled' && tvRes.value?.results?.length) {
              const results = tvRes.value.results;
              const top = results.find(r => r.original_language && INDIAN_LANGUAGES.has(r.original_language))
                ?? results[0];
              if (top && !tvMap.has(top.id)) {
                tvMap.set(top.id, { ...top, media_type: 'tv' });
              }
            }
          } catch {
            // Ignore individual search failures
          }
        })
      );
    }

    return {
      movies: Array.from(movieMap.values()).slice(0, 10),
      tvShows: Array.from(tvMap.values()).slice(0, 10),
    };
  }

  /**
   * Get trending Indian movies and TV shows using YouTube as the signal source.
   * Falls back to empty arrays if YouTube API key is not configured.
   * Results are cached for 3 hours.
   */
  async getYouTubeTrendingForIndia(): Promise<{ movies: Movie[]; tvShows: Movie[] }> {
    if (!this.isAvailable()) {
      return { movies: [], tvShows: [] };
    }

    // Return cached result if fresh
    if (this.cache && Date.now() - this.cache.fetchedAt < this.CACHE_TTL_MS) {
      return { movies: this.cache.movies, tvShows: this.cache.tvShows };
    }

    try {
      const titles = await this.fetchTrendingVideoTitles(25);
      const result = await this.resolveTitlesToMovies(titles);

      this.cache = { ...result, fetchedAt: Date.now() };
      return result;
    } catch (error) {
      console.error('YouTube trending fetch failed:', error);
      return { movies: [], tvShows: [] };
    }
  }

  isConfigured(): boolean {
    return this.isAvailable();
  }
}

let youtubeServiceInstance: YouTubeService | null = null;

export const getYouTubeService = (): YouTubeService => {
  if (!youtubeServiceInstance) {
    youtubeServiceInstance = new YouTubeService();
  }
  return youtubeServiceInstance;
};

export const youtubeService = (() => {
  if (!youtubeServiceInstance) {
    youtubeServiceInstance = new YouTubeService();
  }
  return youtubeServiceInstance;
})();
