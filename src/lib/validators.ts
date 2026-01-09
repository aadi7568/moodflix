/**
 * Input Validation Schemas using Zod
 * 
 * Provides runtime validation for all API inputs
 */

import { z } from 'zod';

export const moodParserSchema = z.object({
  text: z
    .string()
    .min(1, 'Text cannot be empty')
    .max(500, 'Text must be 500 characters or less')
    .refine(
      (text) => {
        // Basic check for prompt injection patterns
        const lowerText = text.toLowerCase();
        return !lowerText.includes('ignore previous') && 
               !lowerText.includes('system:') &&
               !lowerText.includes('assistant:');
      },
      'Invalid input format'
    ),
});

export const recommendationsSchema = z.object({
  mood: z.enum([
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
  ]),
  preferences: z
    .array(z.string().max(50))
    .max(20, 'Maximum 20 preferences allowed')
    .optional(),
  parsedMoodInfo: z
    .object({
      primaryMood: z.string(),
      secondaryMoods: z.array(z.string()).optional(),
      preferences: z.array(z.string()).optional(),
    })
    .optional(),
});

export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(200, 'Query must be 200 characters or less')
    .regex(/^[\w\s\-'.,!?()]+$/, 'Invalid query format'),
});

export const trendingParamsSchema = z.object({
  mediaType: z.enum(['movie', 'tv', 'all']).optional().default('all'),
  timeWindow: z.enum(['day', 'week']).optional().default('day'),
});

