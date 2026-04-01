'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, ExternalLink } from 'lucide-react';
import TrendingCarousel from '../../components/TrendingCarousel';
import DarkModeToggle from '../../components/DarkModeToggle';
import { Movie } from '../../types/movie';
import Image from 'next/image';

interface SearchData {
  exactMatch: Movie | null;
  similarMovies: Movie[];
  trendingInIndia: Movie[];
  globalTrending: Movie[];
  searchResults: Movie[];
  intent: string;
  query: string;
}

/** Featured card for the exact match */
function ExactMatchCard({ movie }: { movie: Movie }) {
  const title = movie.title || movie.name || '';
  const year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
  const providers = movie.watch_providers?.flatrate ?? [];

  return (
    <div className="flex gap-5 p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 mb-10">
      {movie.poster_path && (
        <div className="flex-shrink-0 w-28 h-40 relative rounded-xl overflow-hidden shadow">
          <Image
            src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
            alt={title}
            fill
            className="object-cover"
            sizes="112px"
          />
        </div>
      )}
      <div className="flex flex-col justify-between min-w-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{year}</p>
          {movie.vote_average > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {movie.vote_average.toFixed(1)}
              </span>
            </div>
          )}
          {movie.overview && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">{movie.overview}</p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {movie.imdb_url && (
            <a
              href={movie.imdb_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 bg-yellow-400 text-black text-xs font-bold rounded-lg hover:bg-yellow-300 transition-colors"
            >
              IMDb <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {providers.slice(0, 3).map(p => (
            <div key={p.provider_id} className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              {p.logo_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                  alt={p.provider_name}
                  className="w-4 h-4 rounded"
                />
              )}
              <span className="text-xs text-gray-700 dark:text-gray-300">{p.provider_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) { router.push('/'); return; }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(query.trim())}`, {
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Search failed');
        setData({
          exactMatch:      json.exactMatch      ?? null,
          similarMovies:   json.similarMovies   ?? [],
          trendingInIndia: json.trendingInIndia ?? [],
          globalTrending:  json.globalTrending  ?? [],
          searchResults:   json.searchResults   ?? [],
          intent:          json.intent          ?? 'generic_search',
          query:           json.query           ?? query,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, router]);

  const isSpecific = data?.intent === 'specific_movie' || data?.intent === 'similar_movies';
  const hasResults = data && (
    data.exactMatch ||
    data.similarMovies.length > 0 ||
    data.trendingInIndia.length > 0 ||
    data.globalTrending.length > 0 ||
    data.searchResults.length > 0
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 z-50">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
          <DarkModeToggle />
        </motion.div>
      </div>

      <div className="container mx-auto px-4 pt-16 pb-12 sm:pt-20 md:pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
            {data?.intent === 'similar_movies' ? `Movies like "${query}"` : `Results for "${query}"`}
          </h1>
          {data && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data.intent === 'similar_movies'
                ? 'Similar plots, themes, and vibes — plus what\'s trending'
                : data.intent === 'specific_movie'
                ? 'Best match, similar picks, and trending in the same genre'
                : 'Search results and trending picks'}
            </p>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Searching…</p>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center"
            >
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </motion.div>
          )}

          {!loading && !error && hasResults && (
            <motion.div
              key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }} className="space-y-10"
            >
              {/* Best Match */}
              {data!.exactMatch && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Best Match</h2>
                  <ExactMatchCard movie={data!.exactMatch} />
                </section>
              )}

              {/* Similar movies (specific or similar intent) */}
              {isSpecific && data!.similarMovies.length > 0 && (
                <TrendingCarousel
                  items={data!.similarMovies}
                  title={data!.intent === 'similar_movies'
                    ? `Movies Similar to "${data!.exactMatch?.title || query}"`
                    : 'You Might Also Like'}
                />
              )}

              {/* Trending in India — same genre */}
              {data!.trendingInIndia.length > 0 && (
                <TrendingCarousel
                  items={data!.trendingInIndia}
                  title={isSpecific ? 'Trending in India — Same Genre' : 'Trending in India'}
                />
              )}

              {/* Global trending — same genre */}
              {data!.globalTrending.length > 0 && (
                <TrendingCarousel
                  items={data!.globalTrending}
                  title={isSpecific ? 'Trending Globally — Same Genre' : 'Trending Globally'}
                />
              )}

              {/* Generic search results */}
              {data!.intent === 'generic_search' && data!.searchResults.length > 0 && (
                <TrendingCarousel items={data!.searchResults} title="Search Results" />
              )}
            </motion.div>
          )}

          {!loading && !error && !hasResults && (
            <motion.div
              key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center"
            >
              <p className="text-gray-600 dark:text-gray-400">
                No results found for &quot;{query}&quot;. Try a different search.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </main>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
