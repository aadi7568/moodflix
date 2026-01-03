'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film } from 'lucide-react';
import MoodSelector from '../components/MoodSelector';
import MovieCard from '../components/MovieCard';
import MovieCardSkeleton from '../components/MovieCardSkeleton';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import PageTransition from '../components/PageTransition';
import { MoodType } from '../types/mood';
import { Movie } from '../types/movie';

export default function HomePage() {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [recommendations, setRecommendations] = useState<Movie[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const recommendationsRef = useRef<HTMLDivElement>(null);

  // Scroll to recommendations when they're loaded
  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
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
  }, [recommendations]);

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
    setRecommendations(null);

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mood }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error('Unable to load recommendations. Please try again.');
      }
      
      if (!data.success) {
        throw new Error('Unable to load recommendations. Please try again.');
      }
      
      const movies = data.movies || [];
      
      if (movies.length === 0) {
        setError('No recommendations found. Please try again or select a different mood.');
        setRecommendations([]);
      } else {
        setRecommendations(movies);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Unable to load recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
        {/* Animated gradient background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
        </div>
        <div className="container mx-auto px-4 py-8 md:py-12 lg:py-16 relative z-10">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12 md:mb-16"
        >
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
          >
            What&apos;s your mood?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
          >
            Discover the perfect movies and shows that match how you&apos;re feeling right now
          </motion.p>
        </motion.section>

        {/* Mood Selector Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12 md:mb-16"
        >
          <MoodSelector
            selectedMood={selectedMood}
            onMoodSelect={handleMoodSelect}
          />
        </motion.section>

        {/* Recommendations Section */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.section
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-12"
            >
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Finding Your Recommendations
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Searching for the perfect matches...
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <MovieCardSkeleton count={8} />
              </div>
            </motion.section>
          )}

          {error && (
            <motion.section
              ref={recommendationsRef}
              key="error"
              className="mt-12"
            >
              <ErrorMessage
                message={error}
                onRetry={() => {
                  setError(null);
                  if (selectedMood) {
                    handleMoodSelect(selectedMood);
                  }
                }}
              />
            </motion.section>
          )}

          {recommendations && recommendations.length > 0 && (
            <motion.section
              ref={recommendationsRef}
              key="recommendations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="mt-12"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-8"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Your Recommendations
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  We found {recommendations.length} perfect match{recommendations.length !== 1 ? 'es' : ''} for your mood
                </p>
              </motion.div>

              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 0.2,
                    },
                  },
                }}
                initial="hidden"
                animate="show"
              >
                {recommendations.map((movie) => (
                  <motion.div
                    key={movie.id}
                    variants={{
                      hidden: { opacity: 0, y: 30, scale: 0.9 },
                      show: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: {
                          type: 'spring',
                          stiffness: 100,
                          damping: 15,
                        },
                      },
                    }}
                  >
                    <MovieCard movie={movie} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}

          {recommendations && recommendations.length === 0 && !error && (
            <motion.section
              key="empty"
              className="mt-12"
            >
              <EmptyState
                icon={Film}
                title="No recommendations found"
                description="We couldn't find any movies matching your mood. Try selecting a different mood or check back later!"
                actionLabel="Select Another Mood"
                onAction={() => {
                  setRecommendations(null);
                  setSelectedMood(null);
                }}
              />
            </motion.section>
          )}
        </AnimatePresence>
        </div>
      </main>
    </PageTransition>
  );
}
