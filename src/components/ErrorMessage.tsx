'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export default function ErrorMessage({
  message,
  title = "Oops! Something went wrong",
  onRetry,
  retryLabel = 'Try Again',
  className = '',
}: ErrorMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-xl p-6 text-center ${className}`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="flex items-center justify-center mb-3"
      >
        <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
      </motion.div>
      
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
        {title}
      </h3>
      
      <p className="text-red-600 dark:text-red-300 mb-4">
        {message}
      </p>
      
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="px-6 py-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
        >
          {retryLabel}
        </motion.button>
      )}
    </motion.div>
  );
}

