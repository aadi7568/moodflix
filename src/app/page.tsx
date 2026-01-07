'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import MoodSelector from '../components/MoodSelector';
import NaturalLanguageMoodInput from '../components/NaturalLanguageMoodInput';
import MovieCard from '../components/MovieCard';
import DarkModeToggle from '../components/DarkModeToggle';
import { MoodType, NaturalLanguageMoodResponse } from '../types/mood';
import { Movie } from '../types/movie';
import { MOODS } from '../config/moods';

export default function HomePage() {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [recommendations, setRecommendations] = useState<Movie[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'buttons' | 'natural'>('buttons');
  const [parsedMoodInfo, setParsedMoodInfo] = useState<NaturalLanguageMoodResponse | null>(null);
  const [preferences, setPreferences] = useState<string[]>([]);
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

  const handleMoodSelect = async (mood: MoodType, prefs?: string[]) => {
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
        body: JSON.stringify({ 
          mood,
          preferences: prefs || preferences,
        }),
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

  const handleNaturalLanguageParsed = (parsed: NaturalLanguageMoodResponse) => {
    setParsedMoodInfo(parsed);
    setPreferences(parsed.preferences);
    setSelectedMood(parsed.primaryMood);
    // Automatically fetch recommendations
    handleMoodSelect(parsed.primaryMood, parsed.preferences);
  };

  const handleInputModeToggle = () => {
    setInputMode(inputMode === 'buttons' ? 'natural' : 'buttons');
    setSelectedMood(null);
    setRecommendations(null);
    setParsedMoodInfo(null);
    setPreferences([]);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
      {/* Dark Mode Toggle - Top Right */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <DarkModeToggle />
        </motion.div>
      </div>
      <div className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            What&apos;s your mood?
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover the perfect movies and shows that match how you&apos;re feeling right now
          </p>
        </motion.section>

        {/* Input Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <button
            onClick={handleInputModeToggle}
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            aria-label={`Switch to ${inputMode === 'buttons' ? 'natural language' : 'mood buttons'} input`}
          >
            {inputMode === 'buttons' ? (
              <>
                <ToggleLeft className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Switch to Natural Language
                </span>
              </>
            ) : (
              <>
                <ToggleRight className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Switch to Mood Buttons
                </span>
              </>
            )}
          </button>
        </motion.div>

        {/* Mood Input Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12 md:mb-16"
        >
          <AnimatePresence mode="wait">
            {inputMode === 'buttons' ? (
              <motion.div
                key="buttons"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <MoodSelector
                  selectedMood={selectedMood}
                  onMoodSelect={handleMoodSelect}
                />
              </motion.div>
            ) : (
              <motion.div
                key="natural"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <NaturalLanguageMoodInput
                  onMoodParsed={handleNaturalLanguageParsed}
                  onError={setError}
                />
              </motion.div>
            )}
          </AnimatePresence>
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
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Your Recommendations
                </h2>
                <div className="space-y-2">
                  <p className="text-gray-600 dark:text-gray-400">
                    We found {recommendations.length} perfect match{recommendations.length !== 1 ? 'es' : ''} for your mood
                  </p>
                  {parsedMoodInfo && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Detected: {MOODS[parsedMoodInfo.primaryMood].emoji} {MOODS[parsedMoodInfo.primaryMood].label}
                      </span>
                      {parsedMoodInfo.secondaryMoods.length > 0 && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          + {parsedMoodInfo.secondaryMoods.map(m => MOODS[m].emoji).join(' ')}
                        </span>
                      )}
                      {preferences.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {preferences.map((pref, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            >
                              {pref}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recommendations.map((movie, index) => (
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

          {recommendations && recommendations.length === 0 && (
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
