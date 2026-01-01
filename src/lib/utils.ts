import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines clsx and tailwind-merge for className management
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Constructs a full TMDB image URL from a path
 * @param path - The image path from TMDB (nullable)
 * @param size - Image size: 'w500' or 'original' (default: 'w500')
 * @returns Full TMDB image URL or placeholder path
 */
export function getImageUrl(
  path: string | null,
  size: 'w500' | 'original' = 'w500'
): string {
  if (!path) {
    return '/placeholder-movie.png';
  }
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Formats a date string to 'Month Day, Year' format
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Returns a color class based on rating value
 * @param rating - Rating value (0-10)
 * @returns Tailwind color class
 */
export function getRatingColor(rating: number): string {
  if (rating >= 8) {
    return 'text-green-500';
  }
  if (rating >= 6) {
    return 'text-yellow-500';
  }
  return 'text-red-500';
}

