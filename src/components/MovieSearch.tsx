'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { Movie } from '../types/movie';

interface MovieSearchProps {
  onClear?: () => void;
}

const POPULAR_SEARCHES = [
  'Pushpa 2', 'Kalki 2898 AD', 'Interstellar', 'Inception',
  'The Dark Knight', 'RRR', 'Oppenheimer', '3 Idiots',
];

export default function MovieSearch({ onClear }: MovieSearchProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(q.trim())}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        // Show exactMatch first, then up to 4 more from searchResults
        const items: Movie[] = [];
        if (data.exactMatch) items.push(data.exactMatch);
        for (const m of (data.searchResults || [])) {
          if (items.length >= 5) break;
          if (!items.find(i => i.id === m.id)) items.push(m);
        }
        setSuggestions(items);
        setShowSuggestions(true);
      }
    } catch { /* silently ignore */ }
    finally { setLoadingSuggestions(false); }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const navigate = (q: string) => {
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) { setError('Please enter a movie title to search'); return; }
    navigate(input);
  };

  const handleClear = () => {
    setInput('');
    setError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    onClear?.();
    inputRef.current?.focus();
  };

  const year = (movie: Movie) => {
    const d = movie.release_date || movie.first_air_date || '';
    return d ? d.slice(0, 4) : '';
  };

  return (
    <div className="w-full space-y-4" ref={wrapperRef}>
      {/* Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleClear();
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Search movies, shows — e.g. movies like Interstellar..."
            className={cn(
              'w-full pl-12 pr-12 py-4 rounded-xl text-lg',
              'bg-white dark:bg-gray-800',
              'border-2 transition-all duration-300',
              'text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              error ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700',
            )}
            aria-label="Search for movies"
          />
          {(input || loadingSuggestions) && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Live suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden"
            >
              {suggestions.map(movie => (
                <li key={movie.id}>
                  <button
                    type="button"
                    onMouseDown={() => navigate(movie.title || movie.name || '')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    {movie.poster_path
                      ? <img
                          src={`https://image.tmdb.org/t/p/w45${movie.poster_path}`}
                          alt=""
                          className="w-8 h-12 object-cover rounded flex-shrink-0"
                        />
                      : <div className="w-8 h-12 bg-gray-200 dark:bg-gray-600 rounded flex-shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {movie.title || movie.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {year(movie)}{movie.vote_average > 0 ? ` · ★ ${movie.vote_average.toFixed(1)}` : ''}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onMouseDown={() => navigate(input)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <Search className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    Search for &quot;{input}&quot;
                  </span>
                </button>
              </li>
            </motion.ul>
          )}
        </AnimatePresence>
      </form>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popular searches (shown when input is empty) */}
      <AnimatePresence>
        {!input && !error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                  onClick={() => navigate(suggestion)}
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
