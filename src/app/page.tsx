'use client';

import { motion } from 'framer-motion';
import MoodSelector from '../components/MoodSelector';
import MovieSearch from '../components/MovieSearch';
import TrendingSection from '../components/TrendingSection';
import DarkModeToggle from '../components/DarkModeToggle';

export default function HomePage() {

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
          <MoodSelector />
        </motion.section>

        {/* Trending Section */}
        <TrendingSection />
    </div>
    </main>
  );
}
