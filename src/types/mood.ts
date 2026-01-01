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

export interface Mood {
  id: MoodType;
  label: string;
  emoji: string;
  description: string;
  color: string;
  genrePreferences: number[];
}

export interface MoodAnalysisRequest {
  mood: MoodType;
  preferences?: string;
}

export interface RecommendationResponse {
  mood: MoodType;
  movies: Movie[];
  reasoning: string;
}

