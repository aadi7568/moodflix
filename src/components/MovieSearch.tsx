'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, AlertCircle } from 'lucide-react';
import { Movie } from '../types/movie';
import { cn } from '../lib/utils';

interface MovieSearchProps {
  onSearchResults: (movies: Movie[], query: string) => void;
  onError?: (error: string) => void;
  onClear?: () => void;
}

export default function MovieSearch({
  onSearchResults,
  onError,
  onClear,
}: MovieSearchProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(input.trim())}`);

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || 'Failed to search movies';
        throw new Error(errorMsg);
      }

      const movies: Movie[] = data.movies || [];
      onSearchResults(movies, data.query || input.trim());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search movies. Please try again.';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInput('');
    setError(null);
    if (onClear) {
      onClear();
    }
    inputRef.current?.focus();
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
            placeholder="Search for movies..."
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
            disabled={isLoading}
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
          {isLoading && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
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
    </div>
  );
}

