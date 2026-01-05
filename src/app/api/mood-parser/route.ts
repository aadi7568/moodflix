import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';
import { MoodType } from '@/types/mood';

export const dynamic = 'force-dynamic';

const MAX_TEXT_LENGTH = 500;

export async function POST(request: NextRequest) {
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

    return NextResponse.json(
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

