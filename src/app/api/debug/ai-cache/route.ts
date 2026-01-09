import { NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to view AI cache status and statistics
 * Only available when explicitly enabled via environment variable
 */
export async function GET() {
  // Use explicit feature flag instead of NODE_ENV
  const ENABLE_DEBUG = process.env.ENABLE_DEBUG === 'true';
  
  if (!ENABLE_DEBUG) {
    return NextResponse.json(
      { error: 'Debug endpoint is disabled' },
      { status: 403 }
    );
  }

  try {
    const stats = aiService.getCacheStats();

    // Don't expose sensitive configuration
    return NextResponse.json(
      {
        cache: {
          totalEntries: stats.totalEntries,
          validEntries: stats.validEntries,
          expiredEntries: stats.expiredEntries,
        },
        // Don't expose API key presence or other sensitive config
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

