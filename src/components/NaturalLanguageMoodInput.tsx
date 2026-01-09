'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { NaturalLanguageMoodResponse } from '../types/mood';
import { MOODS } from '../config/moods';
import { cn } from '../lib/utils';

interface NaturalLanguageMoodInputProps {
  onMoodParsed: (parsedMood: NaturalLanguageMoodResponse) => void;
  onError?: (error: string) => void;
}

const EXAMPLE_PHRASES = [
  "I feel tired but want something uplifting",
  "Something calm and hopeful",
  "I'm sad but want to feel better",
  "Exciting but not too intense",
  "Something short and funny",
];

export default function NaturalLanguageMoodInput({
  onMoodParsed,
  onError,
}: NaturalLanguageMoodInputProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<NaturalLanguageMoodResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_LENGTH = 200;

  useEffect(() => {
    // Auto-focus on mount
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e?: React.FormEvent, textOverride?: string) => {
    e?.preventDefault();
    
    const textToSubmit = textOverride || input;
    
    if (!textToSubmit.trim()) {
      setError('Please enter how you\'re feeling');
      return;
    }

    if (textToSubmit.length > MAX_LENGTH) {
      setError(`Input must be ${MAX_LENGTH} characters or less`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedResult(null);
    setShowExamples(false);

    try {
      const response = await fetch('/api/mood-parser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session token
        body: JSON.stringify({ text: textToSubmit }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || 'Failed to parse mood';
        // Provide helpful suggestions based on error
        if (data.confidence !== undefined && data.confidence < 50) {
          throw new Error('Couldn\'t detect a clear mood. Try: "I feel [emotion]" or "I want something [adjective]"');
        }
        throw new Error(errorMsg);
      }

      // Check confidence level
      if (data.confidence < 50) {
        setError('Low confidence in mood detection. Please try rephrasing or select a mood manually.');
      }

      const parsedMood: NaturalLanguageMoodResponse = {
        primaryMood: data.primaryMood,
        secondaryMoods: data.secondaryMoods || [],
        preferences: data.preferences || [],
        reasoning: data.reasoning,
        confidence: data.confidence,
        originalText: data.originalText,
      };

      setParsedResult(parsedMood);
      onMoodParsed(parsedMood);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse mood. Please try again.';
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
    setParsedResult(null);
    setShowExamples(true);
    inputRef.current?.focus();
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    setShowExamples(false);
    // Submit immediately with the example text, don't wait for state update
    handleSubmit(undefined, example);
  };

  const primaryMoodConfig = parsedResult ? MOODS[parsedResult.primaryMood] : null;

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
            placeholder="Describe how you're feeling... (e.g., 'tired but want something uplifting')"
            className={cn(
              'w-full pl-12 pr-12 py-4 rounded-xl',
              'bg-white dark:bg-gray-800',
              'border-2 transition-all duration-300',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              error
                ? 'border-red-300 dark:border-red-700'
                : parsedResult
                ? 'border-green-300 dark:border-green-700'
                : 'border-gray-200 dark:border-gray-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            disabled={isLoading}
            maxLength={MAX_LENGTH}
            aria-label="Natural language mood input"
            aria-describedby={error ? 'error-message' : undefined}
          />
          {input && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Clear input"
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
        {input.length > 0 && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-right">
            {input.length}/{MAX_LENGTH}
          </div>
        )}
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

      {/* Parsed Result */}
      <AnimatePresence>
        {parsedResult && primaryMoodConfig && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800"
          >
            <div className="flex items-start gap-3">
              <div className="text-3xl">{primaryMoodConfig.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Detected: {primaryMoodConfig.label}
                  </h3>
                  {parsedResult.secondaryMoods.length > 0 && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      (with {parsedResult.secondaryMoods.map(m => MOODS[m].label).join(', ')} undertones)
                    </span>
                  )}
                </div>
                
                {parsedResult.preferences.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {parsedResult.preferences.map((pref, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      >
                        {pref}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${parsedResult.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {parsedResult.confidence}% confidence
                  </span>
                </div>

                <details className="mt-2">
                  <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
                    Why this mood?
                  </summary>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {parsedResult.reasoning}
                  </p>
                </details>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example Phrases */}
      <AnimatePresence>
        {showExamples && !input && !parsedResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Try these examples:
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PHRASES.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleExampleClick(example)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

