'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import TrendingCarousel from '../../components/TrendingCarousel';
import DarkModeToggle from '../../components/DarkModeToggle';
import { Movie } from '../../types/movie';
import { MoodType } from '../../types/mood';
import { MOODS } from '../../config/moods';

interface RecommendationData {
  indiaMovies: Movie[];
  indiaTVShows: Movie[];
  globalMovies: Movie[];
  globalTVShows: Movie[];
  message: string;
}

function RecommendationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const moodParam = searchParams.get('mood') as MoodType | null;

  const [data, setData] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async (mood: MoodType) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mood }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Failed to load recommendations');
      setData({
        indiaMovies:  json.indiaMovies  || [],
        indiaTVShows: json.indiaTVShows || [],
        globalMovies: json.globalMovies || [],
        globalTVShows: json.globalTVShows || [],
        message: json.message || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!moodParam || !MOODS[moodParam]) { router.push('/'); return; }
    fetchRecommendations(moodParam);
  }, [moodParam, router]);

  const selectedMood = moodParam ? MOODS[moodParam] : null;
  const hasContent = data && (
    data.indiaMovies.length > 0 || data.indiaTVShows.length > 0 ||
    data.globalMovies.length > 0 || data.globalTVShows.length > 0
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 z-50">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
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
          {data?.message && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{data.message}</p>
          )}
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-xl p-6 text-center"
            >
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Oops! Something went wrong</h3>
              <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
              <button
                onClick={() => moodParam && fetchRecommendations(moodParam)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {!loading && !error && hasContent && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}
              className="space-y-12"
            >
              {data!.indiaMovies.length > 0 && (
                <TrendingCarousel
                  items={data!.indiaMovies}
                  title={`Indian Movies — ${selectedMood?.label} Mood`}
                />
              )}
              {data!.indiaTVShows.length > 0 && (
                <TrendingCarousel
                  items={data!.indiaTVShows}
                  title={`Indian TV Shows — ${selectedMood?.label} Mood`}
                />
              )}
              {data!.globalMovies.length > 0 && (
                <TrendingCarousel
                  items={data!.globalMovies}
                  title={`Global Movies — ${selectedMood?.label} Mood`}
                />
              )}
              {data!.globalTVShows.length > 0 && (
                <TrendingCarousel
                  items={data!.globalTVShows}
                  title={`Global TV Shows — ${selectedMood?.label} Mood`}
                />
              )}
            </motion.div>
          )}

          {!loading && !error && !hasContent && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
