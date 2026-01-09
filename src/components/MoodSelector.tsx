'use client';

import { useState } from 'react';
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
  const [hoveredMood, setHoveredMood] = useState<MoodType | null>(null);

  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 overflow-x-auto pt-2 pb-4">
        {moods.map((mood) => {
          const isSelected = selectedMood === mood.id;
          const isHovered = hoveredMood === mood.id;

          return (
            <div key={mood.id} className="relative group" style={{ zIndex: isHovered ? 50 : 'auto' }}>
              <motion.button
                onClick={() => onMoodSelect(mood.id)}
                onMouseEnter={() => setHoveredMood(mood.id)}
                onMouseLeave={() => setHoveredMood(null)}
                className={cn(
                  'relative w-12 h-12 sm:w-14 sm:h-14 rounded-full',
                  'flex items-center justify-center',
                  'border-2 transition-all duration-300',
                  'bg-white dark:bg-gray-800',
                  'shadow-sm hover:shadow-md',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  isSelected
                    ? `${borderColorMap[mood.color] || 'border-gray-500'} ring-2 ring-offset-2 ring-blue-500/50 shadow-md`
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                aria-pressed={isSelected}
                aria-label={`Select ${mood.label} mood`}
              >
                {/* Emoji */}
                <span className="text-2xl sm:text-3xl">{mood.emoji}</span>

                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    className={cn(
                      'absolute w-5 h-5 rounded-full',
                      'flex items-center justify-center',
                      mood.color,
                      'text-white text-xs font-bold',
                      'shadow-sm z-10'
                    )}
                    style={{
                      top: '-4px',
                      right: '-4px',
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    ✓
                  </motion.div>
                )}
              </motion.button>

              {/* Tooltip */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full left-1/2 mb-2 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-sm whitespace-nowrap pointer-events-none z-50 shadow-lg"
                  style={{ 
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="font-medium">{mood.label}</div>
                  <div className="text-xs text-gray-300 mt-0.5">{mood.description}</div>
                  {/* Tooltip arrow - positioned relative to tooltip center */}
                  <div 
                    className="absolute top-full left-1/2 -mt-1 pointer-events-none"
                    style={{
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

