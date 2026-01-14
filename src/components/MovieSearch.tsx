'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface MovieSearchProps {
  onClear?: () => void;
}

const POPULAR_SEARCHES = [
  'The Matrix',
  'Inception',
  'Interstellar',
  'The Dark Knight',
  'Pulp Fiction',
  'Fight Club',
  'The Shawshank Redemption',
  'Forrest Gump',
];

export default function MovieSearch({
  onClear,
}: MovieSearchProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!input.trim()) {
      setError('Please enter a movie title to search');
      return;
    }

    // Navigate to search page
    router.push(`/search?q=${encodeURIComponent(input.trim())}`);
  };

  const handleClear = () => {
    setInput('');
    setError(null);
    if (onClear) {
      onClear();
    }
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setError(null);
    // Navigate to search page
    router.push(`/search?q=${encodeURIComponent(suggestion.trim())}`);
  };

  return (
    <div className="w-full space-y-4">
      {/* Input Field */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleClear();
              }
            }}
            placeholder="Search for movies, TV shows, and more..."
            className={cn(
              'w-full pl-12 pr-12 py-4 rounded-xl',
              'bg-white dark:bg-gray-800',
              'border-2 transition-all duration-300',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              error
                ? 'border-red-300 dark:border-red-700'
                : 'border-gray-200 dark:border-gray-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'text-lg'
            )}
            aria-label="Search for movies"
            aria-describedby={error ? 'error-message' : undefined}
          />
          {input && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </form>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            id="error-message"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Suggestions */}
      <AnimatePresence>
        {!input && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Popular searches:
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

