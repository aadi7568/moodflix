'use client';

import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/use-theme';

export default function DarkModeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    // Return a placeholder to prevent layout shift
    return (
      <div className="w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
    );
  }

  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        relative flex items-center justify-between
        w-12 h-6 rounded-full
        bg-gray-200 dark:bg-gray-700
        border-2 border-gray-300 dark:border-gray-600
        transition-colors duration-300
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        focus:ring-offset-white dark:focus:ring-offset-gray-900
        cursor-pointer
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Toggle circle */}
      <motion.div
        className={`
          absolute top-0.5
          w-5 h-5 rounded-full
          bg-white dark:bg-gray-800
          shadow-md
          flex items-center justify-center
        `}
        initial={false}
        animate={{
          x: isDark ? 26 : 2,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
        style={{
          left: '2px',
        }}
      >
        {isDark ? (
          <Moon className="w-3 h-3 text-gray-700 dark:text-gray-300" />
        ) : (
          <Sun className="w-3 h-3 text-yellow-500" />
        )}
      </motion.div>
    </motion.button>
  );
}

