export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

export interface WatchProviders {
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  media_type: 'movie' | 'tv';
  original_language?: string;
  name?: string;
  first_air_date?: string;
  imdb_id?: string | null;
  imdb_url?: string | null;
  watch_providers?: WatchProviders;
}

export interface MovieDetails extends Movie {
  genres: Genre[];
  runtime?: number;
  tagline?: string;
  production_companies: ProductionCompany[];
}

export interface TMDBResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

