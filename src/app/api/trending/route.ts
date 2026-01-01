import { NextRequest, NextResponse } from 'next/server';
import { tmdbService } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mediaType = (searchParams.get('mediaType') as 'movie' | 'tv' | 'all') || 'all';
    const timeWindow = (searchParams.get('timeWindow') as 'day' | 'week') || 'day';

    // Validate query parameters
    if (mediaType && !['movie', 'tv', 'all'].includes(mediaType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid mediaType. Must be "movie", "tv", or "all"',
        },
        { status: 400 }
      );
    }

    if (timeWindow && !['day', 'week'].includes(timeWindow)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid timeWindow. Must be "day" or "week"',
        },
        { status: 400 }
      );
    }

    // Fetch trending content from TMDB
    const response = await tmdbService.getTrending(mediaType, timeWindow);

    return NextResponse.json(
      {
        success: true,
        data: response.results,
        page: response.page,
        totalPages: response.total_pages,
        totalResults: response.total_results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching trending content:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trending content',
      },
      { status: 500 }
    );
  }
}

