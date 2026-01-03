'use client';

import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 border-2',
  md: 'w-12 h-12 border-2',
  lg: 'w-16 h-16 border-4',
  xl: 'w-20 h-20 border-4',
};

const spinnerVariants = {
  animate: {
    rotate: 360,
  },
};

const spinnerTransition = {
  duration: 1,
  repeat: Infinity,
  ease: 'linear',
};

export default function LoadingSpinner({
  size = 'md',
  message,
  className = '',
}: LoadingSpinnerProps) {
  const sizeClass = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <motion.div
        className={`${sizeClass} border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full`}
        variants={spinnerVariants}
        animate="animate"
        transition={spinnerTransition}
      />
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-lg text-gray-600 dark:text-gray-400"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}

