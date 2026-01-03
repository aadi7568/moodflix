'use client';

import { motion } from 'framer-motion';

interface MovieCardSkeletonProps {
  count?: number;
}

export default function MovieCardSkeleton({ count = 1 }: MovieCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
          className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md"
        >
          {/* Poster Skeleton */}
          <div className="relative w-full aspect-[2/3] bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse" />

          {/* Content Skeleton */}
          <div className="p-4 space-y-3">
            {/* Title Skeleton */}
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
            </div>

            {/* Rating Skeleton */}
            <div className="flex items-center gap-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
            </div>

            {/* Overview Skeleton */}
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6 animate-pulse" />
            </div>
          </div>
        </motion.div>
      ))}
    </>
  );
}

