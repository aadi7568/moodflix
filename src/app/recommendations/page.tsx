'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import MovieCard from '../../components/MovieCard';
import DarkModeToggle from '../../components/DarkModeToggle';
import { Movie } from '../../types/movie';
import { MoodType } from '../../types/mood';
import { MOODS } from '../../config/moods';

function RecommendationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const moodParam = searchParams.get('mood') as MoodType | null;

  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!moodParam || !MOODS[moodParam]) {
      router.push('/');
      return;
    }

    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ mood: moodParam }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load recommendations');
        }

        const moodMovies = data.movies || [];
        setMovies(moodMovies);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [moodParam, router]);

  const selectedMood = moodParam ? MOODS[moodParam] : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
      {/* Dark Mode Toggle */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <DarkModeToggle />
        </motion.div>
      </div>

      <div className="container mx-auto px-4 pt-16 pb-8 sm:pt-20 md:pt-12 md:py-12 lg:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Your Recommendations
          </h1>
          {selectedMood && (
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedMood.emoji}</span>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Recommendations for your <span className="font-semibold">{selectedMood.label.toLowerCase()}</span> mood
              </p>
            </div>
          )}
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Finding the perfect recommendations for you...
              </p>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-xl p-6 text-center"
            >
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
                Oops! Something went wrong
              </h3>
              <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
              <button
                onClick={() => {
                  if (moodParam) {
                    setError(null);
                    setLoading(true);
                    fetch('/api/recommendations', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                      body: JSON.stringify({ mood: moodParam }),
                    })
                      .then((res) => res.json())
                      .then((data) => {
                        if (data.success) {
                          setMovies(data.movies || []);
                        } else {
                          setError(data.error || 'Failed to load recommendations');
                        }
                      })
                      .catch((err) => {
                        setError(err.message || 'Failed to load recommendations');
                      })
                      .finally(() => setLoading(false));
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {!loading && !error && movies && movies.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We found {movies.length} perfect match{movies.length !== 1 ? 'es' : ''} for your {selectedMood?.label.toLowerCase()} mood
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {movies.map((movie, index) => (
                  <motion.div
                    key={movie.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <MovieCard movie={movie} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {!loading && !error && movies && movies.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center"
            >
              <p className="text-lg text-gray-600 dark:text-gray-400">
                No recommendations found. Try selecting a different mood!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 pt-16 pb-8 flex items-center justify-center min-h-screen">
          <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </main>
    }>
      <RecommendationsContent />
    </Suspense>
  );
}

