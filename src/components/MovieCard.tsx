'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Movie } from '../types/movie';
import { getImageUrl, getRatingColor } from '../lib/utils';

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const title = movie.title || movie.name || 'Untitled';
  const releaseDate = movie.release_date || movie.first_air_date || '';
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  const rating = movie.vote_average || 0;
  const overview = movie.overview || 'No overview available.';
  const truncatedOverview =
    overview.length > 150 ? `${overview.substring(0, 150)}...` : overview;

  const posterUrl = getImageUrl(movie.poster_path);

  return (
    <motion.div
      className="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-shadow duration-300"
      whileHover={{ scale: 1.03, y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Poster Image */}
      <div className="relative w-full aspect-[2/3] bg-gray-200 dark:bg-gray-700 overflow-hidden">
        {!imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}
            <Image
              src={posterUrl}
              alt={title}
              fill
              className={`
                object-cover transition-opacity duration-300
                ${imageLoading ? 'opacity-0' : 'opacity-100'}
                group-hover:scale-110 transition-transform duration-500
              `}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 p-4">
            <svg
              className="w-12 h-12 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs text-center">No image available</p>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Title and Year */}
        <div>
          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 line-clamp-2 min-h-[3.5rem]">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {releaseYear}
          </p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 ${getRatingColor(rating)}`}>
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-semibold text-sm">{rating.toFixed(1)}</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({movie.vote_count} votes)
          </span>
        </div>

        {/* Overview */}
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
          {truncatedOverview}
        </p>
      </div>
    </motion.div>
  );
}

