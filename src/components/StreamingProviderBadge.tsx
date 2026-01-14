'use client';

import Image from 'next/image';
import { WatchProvider } from '../types/movie';

interface StreamingProviderBadgeProps {
  providers: WatchProvider[];
  maxDisplay?: number;
}

export default function StreamingProviderBadge({ 
  providers, 
  maxDisplay = 3 
}: StreamingProviderBadgeProps) {
  if (!providers || providers.length === 0) {
    return null;
  }

  // Sort by display_priority and limit to maxDisplay
  const sortedProviders = [...providers]
    .sort((a, b) => (a.display_priority || 0) - (b.display_priority || 0))
    .slice(0, maxDisplay);

  const visibleProviders = sortedProviders.slice(0, maxDisplay);
  const remainingCount = providers.length - visibleProviders.length;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visibleProviders.map((provider) => {
        const logoUrl = provider.logo_path
          ? `https://image.tmdb.org/t/p/w45${provider.logo_path}`
          : null;

        return (
          <div
            key={provider.provider_id}
            className="relative w-8 h-8 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0"
            title={provider.provider_name}
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={provider.provider_name}
                fill
                className="object-contain p-0.5"
                sizes="32px"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[8px] text-gray-600 dark:text-gray-400 font-medium truncate px-1">
                  {provider.provider_name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        );
      })}
      {remainingCount > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
