'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MoodSelector from '../components/MoodSelector';
import MovieSearch from '../components/MovieSearch';
import MovieCard from '../components/MovieCard';
import TrendingSection from '../components/TrendingSection';
import DarkModeToggle from '../components/DarkModeToggle';
import { MoodType } from '../types/mood';
import { Movie } from '../types/movie';
import { MOODS } from '../config/moods';

export default function HomePage() {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const recommendationsRef = useRef<HTMLDivElement>(null);

  // Scroll to results when they're loaded
  useEffect(() => {
    if (movies && movies.length > 0) {
      // Wait for animation to complete and DOM to update
      const timer = setTimeout(() => {
        if (recommendationsRef.current) {
          recommendationsRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 600); // Wait for animation (500ms) + buffer

      return () => clearTimeout(timer);
    }
  }, [movies]);

  // Scroll to error section when error occurs
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        if (recommendationsRef.current) {
          recommendationsRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 300); // Wait for error animation

      return () => clearTimeout(timer);
    }
  }, [error]);


  const handleMoodSelect = async (mood: MoodType) => {
    setSelectedMood(mood);
    setLoading(true);
    setError(null);
    setMovies(null);

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session token
        body: JSON.stringify({ 
          mood,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error('Unable to load recommendations. Please try again.');
      }
      
      if (!data.success) {
        throw new Error('Unable to load recommendations. Please try again.');
      }
      
      const moodMovies = data.movies || [];
      
      if (moodMovies.length === 0) {
        setError('No recommendations found. Please try again or select a different mood.');
        setMovies([]);
      } else {
        setMovies(moodMovies);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Unable to load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
      {/* Dark Mode Toggle - Top Right */}
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
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent px-2 sm:px-0">
            What&apos;s your mood?
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover the perfect movies and shows that match how you&apos;re feeling right now
          </p>
        </motion.section>

        {/* Primary: Search Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 md:mb-10"
        >
          <MovieSearch />
        </motion.section>

        {/* Secondary: Mood Filters */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mb-12 md:mb-16"
        >
          <MoodSelector
            selectedMood={selectedMood}
            onMoodSelect={handleMoodSelect}
          />
        </motion.section>

        {/* Trending Section */}
        <TrendingSection />

        {/* Mood Recommendations Section */}

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.section
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-12"
            >
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Finding the perfect recommendations for you...
                </p>
              </div>
            </motion.section>
          )}

          {error && (
            <motion.section
              ref={recommendationsRef}
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-12"
            >
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
                  Oops! Something went wrong
                </h3>
                <p className="text-red-600 dark:text-red-300">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    if (selectedMood) {
                      handleMoodSelect(selectedMood);
                    }
                  }}
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </motion.section>
          )}

          {movies && movies.length > 0 && (
            <motion.section
              ref={recommendationsRef}
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="mt-12"
            >
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Your Recommendations
                </h2>
                <div className="space-y-2">
                  <p className="text-gray-600 dark:text-gray-400">
                    We found {movies.length} perfect match{movies.length !== 1 ? 'es' : ''} for your {selectedMood && MOODS[selectedMood].label.toLowerCase()} mood
                  </p>
                  {selectedMood && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <span className="text-xl">{MOODS[selectedMood].emoji}</span>
                        <span>{MOODS[selectedMood].label}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

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
            </motion.section>
          )}

          {movies && movies.length === 0 && (
            <motion.section
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-12"
            >
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  No recommendations found. Try selecting a different mood!
                </p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
    </div>
    </main>
  );
}
