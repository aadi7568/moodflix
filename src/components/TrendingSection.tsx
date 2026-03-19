'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import TrendingCarousel from './TrendingCarousel';
import { Movie } from '../types/movie';

interface TrendingData {
  movies: Movie[];
  tvShows: Movie[];
  globalMovies: Movie[];
  globalTVShows: Movie[];
}

export default function TrendingSection() {
  const [trendingData, setTrendingData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/trending?region=IN&mediaType=all', {
          credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch trending content');
        }

        setTrendingData({
          movies: data.movies || [],
          tvShows: data.tvShows || [],
          globalMovies: data.globalMovies || [],
          globalTVShows: data.globalTVShows || [],
        });
      } catch (err) {
        console.error('Error fetching trending:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trending content');
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  if (loading) {
    return (
      <section className="w-full py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading trending content...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded-xl p-6 text-center">
          <p className="text-yellow-800 dark:text-yellow-300">{error}</p>
        </div>
      </section>
    );
  }

  const hasIndiaContent = trendingData && (trendingData.movies.length > 0 || trendingData.tvShows.length > 0);
  const hasGlobalContent = trendingData && (trendingData.globalMovies.length > 0 || trendingData.globalTVShows.length > 0);

  if (!hasIndiaContent && !hasGlobalContent) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full py-8 space-y-12"
    >
      {/* India Trending */}
      {trendingData?.movies && trendingData.movies.length > 0 && (
        <TrendingCarousel
          items={trendingData.movies}
          title="Trending in India — Movies"
        />
      )}
      {trendingData?.tvShows && trendingData.tvShows.length > 0 && (
        <TrendingCarousel
          items={trendingData.tvShows}
          title="Trending in India — TV Shows"
        />
      )}

      {/* Global Trending */}
      {trendingData?.globalMovies && trendingData.globalMovies.length > 0 && (
        <TrendingCarousel
          items={trendingData.globalMovies}
          title="Trending Globally — Movies"
        />
      )}
      {trendingData?.globalTVShows && trendingData.globalTVShows.length > 0 && (
        <TrendingCarousel
          items={trendingData.globalTVShows}
          title="Trending Globally — TV Shows"
        />
      )}
    </motion.section>
  );
}

