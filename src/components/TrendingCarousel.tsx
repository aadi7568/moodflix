'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Movie } from '../types/movie';
import { getImageUrl } from '../lib/utils';
import StreamingProviderBadge from './StreamingProviderBadge';

interface TrendingCarouselProps {
  items: Movie[];
  title: string;
}

export default function TrendingCarousel({ items, title }: TrendingCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < maxScroll - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;

    const scrollAmount = 320; // Width of card + gap

    if (direction === 'left') {
      scrollRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }

    // Update button states after scroll
    setTimeout(updateScrollButtons, 100);
  };

  const handleScroll = () => {
    updateScrollButtons();
  };

  // Initialize scroll button states
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(updateScrollButtons, 100);
    // Also update on window resize
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [items.length]); // Only depend on items length to avoid unnecessary re-runs

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
        {title}
      </h2>
      <div className="relative">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
          </button>
        )}

        {/* Carousel Container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {items.map((movie, index) => {
            const title = movie.title || movie.name || 'Untitled';
            const posterUrl = getImageUrl(movie.poster_path);
            const releaseDate = movie.release_date || movie.first_air_date || '';
            const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';

            return (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex-shrink-0 w-[280px] group"
              >
                <div className="relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                  {/* Number Badge */}
                  <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-sm text-white font-bold text-2xl w-10 h-10 rounded-full flex items-center justify-center">
                    {index + 1}
                  </div>

                  {/* Poster Image */}
                  <div className="relative w-full aspect-[2/3] bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <Image
                      src={posterUrl}
                      alt={`${title} poster`}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="280px"
                      loading="lazy"
                      quality={85}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Card Content */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
                      {title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {releaseYear}
                    </p>
                    <div className="flex items-center gap-1 mt-2 h-4">
                      {movie.vote_average > 0 && (
                        <>
                          <svg
                            className="w-3 h-3 fill-yellow-500"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {movie.vote_average.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Streaming Providers - Always show to maintain consistent layout */}
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 min-h-[40px]">
                      {movie.watch_providers?.flatrate && movie.watch_providers.flatrate.length > 0 ? (
                        <StreamingProviderBadge providers={movie.watch_providers.flatrate} maxDisplay={3} />
                      ) : (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                          Info unavailable
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6 text-gray-900 dark:text-white" />
          </button>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

