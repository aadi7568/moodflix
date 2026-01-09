import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';
import { MoodType } from '@/types/mood';
import { getOrCreateSessionToken, setSessionTokenCookie } from '@/lib/anonymous-auth';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_TEXT_LENGTH = 500;

export async function POST(request: NextRequest) {
  // Rate limiting with anonymous session tokens
  const rateLimitResult = await rateLimitMiddleware(request, 'mood-parser');
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  // Get or create anonymous session token
  const { token, isNew } = await getOrCreateSessionToken(request);

  try {
    const body = await request.json();
    const { text } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Text is required and must be a string',
        },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Text cannot be empty',
        },
        { status: 400 }
      );
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Text must be ${MAX_TEXT_LENGTH} characters or less`,
        },
        { status: 400 }
      );
    }

    // Parse mood using AI service
    let parsedMood = await aiService.parseNaturalLanguageMood(trimmedText);

    // If AI parsing failed, try keyword fallback
    if (!parsedMood) {
      parsedMood = aiService.parseMoodByKeywords(trimmedText);
    }

    // Validate that we got a valid mood
    const validMoods: MoodType[] = [
      'happy',
      'sad',
      'excited',
      'relaxed',
      'romantic',
      'adventurous',
      'scared',
      'thoughtful',
      'energetic',
      'nostalgic',
    ];

    if (!validMoods.includes(parsedMood.primaryMood)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to detect a valid mood',
        },
        { status: 500 }
      );
    }

    // Log parsing attempt for debugging
    console.log(`Mood parsed: "${trimmedText}" → ${parsedMood.primaryMood} (confidence: ${parsedMood.confidence})`);

    // Set session token cookie if it's new
    const response = NextResponse.json(
      {
        success: true,
        primaryMood: parsedMood.primaryMood,
        secondaryMoods: parsedMood.secondaryMoods,
        preferences: parsedMood.preferences,
        reasoning: parsedMood.reasoning,
        confidence: parsedMood.confidence,
        originalText: parsedMood.originalText,
      },
      { status: 200 }
    );

    // Set cookie if new token was created
    if (isNew) {
      const cookie = setSessionTokenCookie(token);
      response.cookies.set(cookie.name, cookie.value, cookie.options);
      // Also include in header for client-side storage fallback
      response.headers.set('x-session-token', token);
    }

    // Add rate limit headers
    if (rateLimitResult.remaining !== undefined && rateLimitResult.reset !== undefined) {
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    }

    return response;
  } catch (error) {
    console.error('Error parsing mood:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to parse mood',
      },
      { status: 500 }
    );
  }
}

