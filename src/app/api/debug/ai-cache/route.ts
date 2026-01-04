import { NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to view AI cache status and statistics
 * Only available in development mode
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const stats = aiService.getCacheStats();
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;

    return NextResponse.json(
      {
        aiServiceConfigured: hasGeminiKey,
        cache: stats,
        environment: process.env.NODE_ENV,
        enableAIReranking: process.env.ENABLE_AI_RERANKING !== 'false',
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

