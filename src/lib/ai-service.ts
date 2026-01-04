import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { Movie, MovieDetails } from '../types/movie';
import { MoodType, EmotionalTone, MovieEmotionalProfile } from '../types/mood';
import { MOODS } from '../config/moods';

// Schema for structured AI response
const EmotionalToneSchema = z.object({
  primaryEmotion: z.string().describe('The primary emotional tone (e.g., "happy", "melancholic", "thrilling")'),
  secondaryEmotions: z.array(z.string()).describe('Additional emotional tones present'),
  tone: z.string().describe('Nuanced tone description (e.g., "bittersweet happy", "calm but hopeful")'),
  intensity: z.enum(['low', 'medium', 'high']).describe('Emotional intensity level'),
  reasoning: z.string().describe('Brief explanation of the emotional analysis'),
});

class AIService {
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;
  private cache: Map<number, MovieEmotionalProfile> = new Map();
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  private getModel() {
    if (!this.model) {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        console.warn('GEMINI_API_KEY not set. AI re-ranking will be disabled.');
        return null;
      }

      const trimmedKey = typeof apiKey === 'string' ? apiKey.trim() : String(apiKey).trim();
      
      if (!trimmedKey || trimmedKey.length < 10) {
        console.warn('GEMINI_API_KEY appears to be invalid. AI re-ranking will be disabled.');
        return null;
      }

      const genAI = new GoogleGenerativeAI(trimmedKey);
      this.model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300,
          responseMimeType: 'application/json',
        },
      });
    }
    return this.model;
  }

  private isCacheValid(profile: MovieEmotionalProfile): boolean {
    const now = Date.now();
    return (now - profile.analyzedAt) < this.CACHE_TTL;
  }

  private getCachedProfile(movieId: number): EmotionalTone | null {
    const cached = this.cache.get(movieId);
    if (cached && this.isCacheValid(cached)) {
      return cached.emotionalTone;
    }
    return null;
  }

  private setCachedProfile(movieId: number, emotionalTone: EmotionalTone): void {
    this.cache.set(movieId, {
      movieId,
      emotionalTone,
      analyzedAt: Date.now(),
    });
  }

  async analyzeMovieEmotionalTone(
    movie: Movie,
    movieDetails?: MovieDetails
  ): Promise<EmotionalTone | null> {
    // Check cache first
    const cached = this.getCachedProfile(movie.id);
    if (cached) {
      return cached;
    }

    const model = this.getModel();
    if (!model) {
      return null;
    }

    try {
      // Build context from available movie information
      const title = movie.title || movie.name || 'Unknown';
      const overview = movie.overview || '';
      const tagline = movieDetails?.tagline || '';
      const genres = movieDetails?.genres?.map(g => g.name).join(', ') || '';
      
      // Create a concise but informative prompt
      const prompt = `You are an expert at analyzing the emotional tone and atmosphere of movies. Provide accurate, nuanced emotional analysis in JSON format.

Analyze the emotional tone and atmosphere of this movie:

Title: ${title}
${tagline ? `Tagline: ${tagline}` : ''}
${genres ? `Genres: ${genres}` : ''}
Overview: ${overview || 'No overview available'}

Provide a structured analysis of the movie's emotional tone, considering:
1. Primary emotional feeling it evokes
2. Secondary emotions present
3. Nuanced tone (e.g., "bittersweet happy", "calm but hopeful", "melancholic but uplifting")
4. Intensity level (low/medium/high)
5. Brief reasoning for your analysis

Be specific about emotional nuances. For example, distinguish between "happy" and "bittersweet happy", or "calm" and "calm but hopeful".

Return your response as a JSON object with the following structure:
{
  "primaryEmotion": "string",
  "secondaryEmotions": ["string"],
  "tone": "string",
  "intensity": "low" | "medium" | "high",
  "reasoning": "string"
}`;

      const result = await model.generateContent(prompt);

      const responseText = result.response.text();
      if (!responseText) {
        throw new Error('Empty response from Gemini');
      }

      // Parse and validate response
      let parsed: unknown;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Failed to parse AI response as JSON: ${parseError}`);
      }

      const validated = EmotionalToneSchema.parse(parsed);

      // Cache the result
      this.setCachedProfile(movie.id, validated);

      return validated;
    } catch (error) {
      console.error(`Error analyzing emotional tone for movie ${movie.id}:`, error);
      return null;
    }
  }

  async analyzeMoviesBatch(
    movies: Movie[],
    movieDetailsMap?: Map<number, MovieDetails>
  ): Promise<Map<number, EmotionalTone>> {
    const results = new Map<number, EmotionalTone>();
    const model = this.getModel();

    if (!model) {
      return results;
    }

    // Filter out movies that are already cached
    const moviesToAnalyze = movies.filter(movie => !this.getCachedProfile(movie.id));

    if (moviesToAnalyze.length === 0) {
      // All movies are cached, return cached results
      movies.forEach(movie => {
        const cached = this.getCachedProfile(movie.id);
        if (cached) {
          results.set(movie.id, cached);
        }
      });
      return results;
    }

    // Process in smaller batches to avoid token limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < moviesToAnalyze.length; i += BATCH_SIZE) {
      const batch = moviesToAnalyze.slice(i, i + BATCH_SIZE);
      
      try {
        // Analyze each movie in the batch (can be parallelized)
        const batchPromises = batch.map(movie => 
          this.analyzeMovieEmotionalTone(
            movie,
            movieDetailsMap?.get(movie.id)
          )
        );

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach((tone, index) => {
          if (tone) {
            results.set(batch[index].id, tone);
          }
        });

        // Small delay to respect rate limits
        if (i + BATCH_SIZE < moviesToAnalyze.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Error in batch analysis:`, error);
        // Continue with next batch
      }
    }

    // Add cached results
    movies.forEach(movie => {
      const cached = this.getCachedProfile(movie.id);
      if (cached && !results.has(movie.id)) {
        results.set(movie.id, cached);
      }
    });

    return results;
  }

  getCacheStats() {
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach(profile => {
      if (this.isCacheValid(profile)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheHitRate: 'N/A', // Would need to track hits/misses
    };
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Scores a movie's emotional match with a target mood (0-100)
   */
  private scoreEmotionalMatch(
    movieTone: EmotionalTone,
    targetMood: MoodType
  ): { score: number; reasoning: string } {
    const moodConfig = MOODS[targetMood];
    if (!moodConfig) {
      return { score: 0, reasoning: 'Invalid mood configuration' };
    }

    let score = 0;
    const reasons: string[] = [];

    // Check primary emotion match
    const primaryEmotionLower = movieTone.primaryEmotion.toLowerCase();
    const targetTones = moodConfig.emotionalTone || [];
    const exclusions = moodConfig.toneExclusions || [];

    // Check for exclusions first (heavy penalty)
    const hasExclusion = exclusions.some(exclusion =>
      primaryEmotionLower.includes(exclusion.toLowerCase()) ||
      movieTone.tone.toLowerCase().includes(exclusion.toLowerCase()) ||
      movieTone.secondaryEmotions.some(emotion =>
        emotion.toLowerCase().includes(exclusion.toLowerCase())
      )
    );

    if (hasExclusion) {
      score -= 50; // Heavy penalty for excluded tones
      reasons.push(`Contains excluded tone: ${exclusions.find(e => 
        primaryEmotionLower.includes(e.toLowerCase()) || 
        movieTone.tone.toLowerCase().includes(e.toLowerCase())
      )}`);
    }

    // Check primary emotion alignment
    const primaryMatch = targetTones.some(targetTone =>
      primaryEmotionLower.includes(targetTone.toLowerCase()) ||
      targetTone.toLowerCase().includes(primaryEmotionLower)
    );

    if (primaryMatch) {
      score += 40;
      reasons.push('Primary emotion matches target mood');
    } else {
      // Partial match check
      const partialMatch = targetTones.some(targetTone => {
        const words = targetTone.toLowerCase().split(/\s+/);
        return words.some(word => primaryEmotionLower.includes(word));
      });
      if (partialMatch) {
        score += 20;
        reasons.push('Partial primary emotion match');
      }
    }

    // Check nuanced tone match (e.g., "bittersweet happy")
    const toneLower = movieTone.tone.toLowerCase();
    const toneMatch = targetTones.some(targetTone =>
      toneLower.includes(targetTone.toLowerCase()) ||
      targetTone.toLowerCase().includes(toneLower)
    );

    if (toneMatch) {
      score += 30;
      reasons.push(`Nuanced tone matches: "${movieTone.tone}"`);
    } else {
      // Check for partial tone match
      const partialToneMatch = targetTones.some(targetTone => {
        const words = targetTone.toLowerCase().split(/\s+/);
        return words.some(word => toneLower.includes(word));
      });
      if (partialToneMatch) {
        score += 15;
        reasons.push('Partial tone match');
      }
    }

    // Check secondary emotions alignment
    const secondaryMatches = movieTone.secondaryEmotions.filter(emotion =>
      targetTones.some(targetTone =>
        emotion.toLowerCase().includes(targetTone.toLowerCase()) ||
        targetTone.toLowerCase().includes(emotion.toLowerCase())
      )
    ).length;

    if (secondaryMatches > 0) {
      score += secondaryMatches * 10;
      reasons.push(`${secondaryMatches} secondary emotion(s) align`);
    }

    // Intensity bonus (for certain moods)
    if (['excited', 'energetic', 'scared'].includes(targetMood) && movieTone.intensity === 'high') {
      score += 10;
      reasons.push('High intensity matches mood');
    } else if (['relaxed'].includes(targetMood) && movieTone.intensity === 'low') {
      score += 10;
      reasons.push('Low intensity matches relaxed mood');
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      reasoning: reasons.length > 0 ? reasons.join('; ') : 'No significant emotional match',
    };
  }

  /**
   * Re-ranks movies based on emotional tone matching with target mood
   */
  async reRankMoviesByMood(
    movies: Movie[],
    mood: MoodType,
    movieDetailsMap?: Map<number, MovieDetails>
  ): Promise<Array<{ movie: Movie; score: number; reasoning: string }>> {
    const model = this.getModel();
    
    // If AI service is unavailable, return movies with neutral scores
    if (!model) {
      console.warn('AI service unavailable, returning movies without re-ranking');
      return movies.map(movie => ({
        movie,
        score: 50, // Neutral score
        reasoning: 'AI re-ranking unavailable, using genre-based sorting',
      }));
    }

    try {
      // Analyze emotional tones for all movies (with caching and batching)
      const emotionalProfiles = await this.analyzeMoviesBatch(movies, movieDetailsMap);

      // Score each movie
      const scoredMovies = movies.map(movie => {
        const emotionalTone = emotionalProfiles.get(movie.id);
        
        if (!emotionalTone) {
          // If analysis failed, give neutral score but keep movie
          return {
            movie,
            score: 50,
            reasoning: 'Emotional analysis unavailable for this movie',
          };
        }

        const match = this.scoreEmotionalMatch(emotionalTone, mood);
        return {
          movie,
          score: match.score,
          reasoning: match.reasoning,
        };
      });

      // Sort by score (descending), then by vote_average as tiebreaker
      scoredMovies.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // Tiebreaker: use vote_average
        return b.movie.vote_average - a.movie.vote_average;
      });

      return scoredMovies;
    } catch (error) {
      console.error('Error in re-ranking movies:', error);
      // Fallback: return movies with neutral scores
      return movies.map(movie => ({
        movie,
        score: 50,
        reasoning: 'Re-ranking failed, using genre-based sorting',
      }));
    }
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null;

export const getAIService = (): AIService => {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
};

export const aiService = getAIService();

