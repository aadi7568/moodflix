'use client';

import { motion } from 'framer-motion';
import { MOODS } from '../config/moods';
import { MoodType } from '../types/mood';
import { cn } from '../lib/utils';

interface MoodSelectorProps {
  selectedMood: MoodType | null;
  onMoodSelect: (mood: MoodType) => void;
}

// Map mood colors to border color classes
const borderColorMap: Record<string, string> = {
  'bg-yellow-500': 'border-yellow-500',
  'bg-blue-500': 'border-blue-500',
  'bg-orange-500': 'border-orange-500',
  'bg-green-500': 'border-green-500',
  'bg-pink-500': 'border-pink-500',
  'bg-purple-500': 'border-purple-500',
  'bg-red-500': 'border-red-500',
  'bg-indigo-500': 'border-indigo-500',
  'bg-yellow-600': 'border-yellow-600',
  'bg-amber-600': 'border-amber-600',
};

export default function MoodSelector({
  selectedMood,
  onMoodSelect,
}: MoodSelectorProps) {
  const moods = Object.values(MOODS);

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {moods.map((mood) => {
          const isSelected = selectedMood === mood.id;

          return (
            <motion.button
              key={mood.id}
              onClick={() => onMoodSelect(mood.id)}
              className={cn(
                'relative p-6 rounded-xl bg-white dark:bg-gray-800',
                'border-2 transition-all duration-200',
                'flex flex-col items-center justify-center gap-3',
                'shadow-md hover:shadow-xl',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                isSelected
                  ? borderColorMap[mood.color] || 'border-gray-500'
                  : 'border-gray-200 dark:border-gray-700 border-opacity-50 hover:border-opacity-100'
              )}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  className={cn(
                    'absolute top-2 right-2 w-6 h-6 rounded-full',
                    'flex items-center justify-center',
                    mood.color,
                    'text-white text-xs font-bold'
                  )}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  ✓
                </motion.div>
              )}

              {/* Emoji */}
              <motion.div
                className="text-4xl md:text-5xl"
                whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
              >
                {mood.emoji}
              </motion.div>

              {/* Label */}
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
                {mood.label}
              </h3>

              {/* Description */}
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center leading-tight">
                {mood.description}
              </p>

              {/* Color accent bar at bottom */}
              <motion.div
                className={cn(
                  'absolute bottom-0 left-0 right-0 h-1 rounded-b-xl',
                  mood.color,
                  'opacity-0'
                )}
                animate={{ opacity: isSelected ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

