import { Movie } from './movie';

export type MoodType =
  | 'happy'
  | 'sad'
  | 'excited'
  | 'relaxed'
  | 'romantic'
  | 'adventurous'
  | 'scared'
  | 'thoughtful'
  | 'energetic'
  | 'nostalgic';

export interface EmotionalTone {
  primaryEmotion: string;
  secondaryEmotions: string[];
  tone: string; // e.g., "bittersweet", "calm but hopeful"
  intensity: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface MovieEmotionalProfile {
  movieId: number;
  emotionalTone: EmotionalTone;
  analyzedAt: number; // timestamp
}

export interface Mood {
  id: MoodType;
  label: string;
  emoji: string;
  description: string;
  color: string;
  genrePreferences: number[];
  emotionalTone?: string[]; // Nuanced emotional characteristics
  toneExclusions?: string[]; // Emotional tones to avoid
}

export interface MoodAnalysisRequest {
  mood: MoodType;
  preferences?: string;
}

export interface RecommendationResponse {
  mood: MoodType;
  movies: Movie[];
  reasoning: string;
  emotionalMatchScores?: Array<{
    movieId: number;
    score: number;
    reasoning: string;
  }>;
  parsedMoodInfo?: NaturalLanguageMoodResponse;
}

export interface NaturalLanguageMoodRequest {
  text: string;
}

export interface NaturalLanguageMoodResponse {
  primaryMood: MoodType;
  secondaryMoods: MoodType[];
  preferences: string[];
  reasoning: string;
  confidence: number;
  originalText: string;
}
