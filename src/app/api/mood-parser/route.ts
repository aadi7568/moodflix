import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';
import { MoodType } from '@/types/mood';
import { getOrCreateSessionToken, setSessionTokenCookie } from '@/lib/anonymous-auth';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/error-handler';
import { sanitizeForLog, validateBodySize } from '@/lib/input-sanitizer';
import { moodParserSchema } from '@/lib/validators';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Rate limiting with anonymous session tokens
  const rateLimitResult = await rateLimitMiddleware(request, 'mood-parser');
  if (!rateLimitResult.success) {
    return rateLimitResult.response!;
  }

  // Get or create anonymous session token
  const { token, isNew } = await getOrCreateSessionToken(request);

  try {
    // Validate request body size
    const bodyText = await request.text();
    validateBodySize(bodyText, 10240); // 10KB max
    
    const body = JSON.parse(bodyText);
    
    // Validate with Zod schema
    const validated = moodParserSchema.parse(body);
    const trimmedText = validated.text.trim();

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

    // Log parsing attempt for debugging (sanitized)
    if (process.env.NODE_ENV === 'development') {
      const sanitizedLog = sanitizeForLog(trimmedText, 50);
      console.log(`Mood parsed: "${sanitizedLog}" → ${parsedMood.primaryMood} (confidence: ${parsedMood.confidence})`);
    }

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
    // Handle validation errors separately
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input data',
          details: process.env.NODE_ENV === 'development' ? error.issues : undefined,
        },
        { status: 400 }
      );
    }

    const { message, status } = handleApiError(error, 'mood-parser', 'Failed to parse mood');
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

