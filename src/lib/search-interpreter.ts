import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { sanitizeForPrompt } from './input-sanitizer';

// Intent types for search queries
export type SearchIntent = 'specific_movie' | 'similar_movies' | 'generic_search';

// Schema for structured AI response
const SearchIntentSchema = z.object({
  intent: z.enum(['specific_movie', 'similar_movies', 'generic_search']).describe('The detected search intent'),
  movieTitle: z.string().nullable().describe('Extracted movie title if applicable (null otherwise)'),
  confidence: z.number().min(0).max(100).describe('Confidence score 0-100 for the intent classification'),
  reasoning: z.string().describe('Brief explanation of the intent classification'),
});

export interface SearchIntentResult {
  intent: SearchIntent;
  movieTitle: string | null;
  confidence: number;
  reasoning: string;
}

interface CachedIntent {
  result: SearchIntentResult;
  cachedAt: number;
}

class SearchInterpreter {
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;
  private cache: Map<string, CachedIntent> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly MIN_CONFIDENCE = 50; // Minimum confidence to use AI classification

  private getModel() {
    if (!this.model) {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        console.warn('GEMINI_API_KEY not set. Search intent classification will fallback to generic search.');
        return null;
      }

      const trimmedKey = typeof apiKey === 'string' ? apiKey.trim() : String(apiKey).trim();
      
      if (!trimmedKey || trimmedKey.length < 10) {
        console.warn('GEMINI_API_KEY appears to be invalid. Search intent classification will fallback to generic search.');
        return null;
      }

      const genAI = new GoogleGenerativeAI(trimmedKey);
      this.model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.2, // Lower temperature for more deterministic intent classification
          maxOutputTokens: 200,
          responseMimeType: 'application/json',
        },
      });
    }
    return this.model;
  }

  private isCacheValid(cached: CachedIntent): boolean {
    const now = Date.now();
    return (now - cached.cachedAt) < this.CACHE_TTL;
  }

  private getCachedIntent(query: string): SearchIntentResult | null {
    const normalizedQuery = query.trim().toLowerCase();
    const cached = this.cache.get(normalizedQuery);
    if (cached && this.isCacheValid(cached)) {
      return cached.result;
    }
    return null;
  }

  private setCachedIntent(query: string, result: SearchIntentResult): void {
    const normalizedQuery = query.trim().toLowerCase();
    this.cache.set(normalizedQuery, {
      result,
      cachedAt: Date.now(),
    });
  }

  /**
   * Classifies the search intent from a user query
   * Returns intent type, extracted movie title (if applicable), confidence, and reasoning
   */
  async classifyIntent(query: string): Promise<SearchIntentResult> {
    if (!query || query.trim().length === 0) {
      return {
        intent: 'generic_search',
        movieTitle: null,
        confidence: 100,
        reasoning: 'Empty query defaults to generic search',
      };
    }

    // Check cache first
    const cached = this.getCachedIntent(query);
    if (cached) {
      return cached;
    }

    const model = this.getModel();
    if (!model) {
      // Fallback to generic search if AI is unavailable
      return {
        intent: 'generic_search',
        movieTitle: null,
        confidence: 50,
        reasoning: 'AI service unavailable, defaulting to generic search',
      };
    }

    try {
      // Sanitize user input to prevent prompt injection
      const sanitizedQuery = sanitizeForPrompt(query, 200);
      
      if (sanitizedQuery.length === 0) {
        // If sanitization removed everything, fallback to generic search
        return {
          intent: 'generic_search',
          movieTitle: null,
          confidence: 50,
          reasoning: 'Query sanitization removed all content, defaulting to generic search',
        };
      }

      const prompt = `Analyze this movie search query and classify the user's intent.

User query: "${sanitizedQuery}"

Classify the intent into one of these categories:
1. "specific_movie": User is searching for a specific movie by title (e.g., "Inception", "Find The Matrix", "Show me Pulp Fiction")
2. "similar_movies": User wants movies similar to a specific movie (e.g., "movies like Inception", "similar to The Matrix", "recommendations like Pulp Fiction")
3. "generic_search": User is doing a general search without a specific movie in mind (e.g., "action movies", "comedy films", "thriller", "movies with Leonardo DiCaprio")

For "specific_movie" or "similar_movies" intents, extract the movie title from the query. Remove common words like "the", "a", "an" from the title, but preserve the original capitalization if it appears to be a proper title.

Return your response as a JSON object with this structure:
{
  "intent": "specific_movie" | "similar_movies" | "generic_search",
  "movieTitle": "extracted title or null",
  "confidence": 0-100,
  "reasoning": "brief explanation"
}

Examples:
- Query: "Inception" → intent: "specific_movie", movieTitle: "Inception", confidence: 95
- Query: "movies like The Matrix" → intent: "similar_movies", movieTitle: "The Matrix", confidence: 90
- Query: "action movies" → intent: "generic_search", movieTitle: null, confidence: 85
- Query: "find Interstellar" → intent: "specific_movie", movieTitle: "Interstellar", confidence: 90`;

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

      const validated = SearchIntentSchema.parse(parsed);
      
      const searchResult: SearchIntentResult = {
        intent: validated.intent,
        movieTitle: validated.movieTitle || null,
        confidence: validated.confidence,
        reasoning: validated.reasoning,
      };

      // Only cache if confidence is above threshold
      if (validated.confidence >= this.MIN_CONFIDENCE) {
        this.setCachedIntent(query, searchResult);
      }

      // If confidence is too low, fallback to generic search
      if (validated.confidence < this.MIN_CONFIDENCE) {
        return {
          intent: 'generic_search',
          movieTitle: null,
          confidence: 50,
          reasoning: `AI confidence (${validated.confidence}) below threshold, defaulting to generic search`,
        };
      }

      return searchResult;
    } catch (error) {
      console.error(`Error classifying search intent for query "${query}":`, error);
      // Fallback to generic search on error
      return {
        intent: 'generic_search',
        movieTitle: null,
        confidence: 50,
        reasoning: `Error during intent classification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Clears the intent classification cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getCacheStats() {
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach((cached) => {
      if (this.isCacheValid(cached)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
    };
  }
}

// Singleton instance
let searchInterpreterInstance: SearchInterpreter | null = null;

export const getSearchInterpreter = (): SearchInterpreter => {
  if (!searchInterpreterInstance) {
    searchInterpreterInstance = new SearchInterpreter();
  }
  return searchInterpreterInstance;
};

export const searchInterpreter = getSearchInterpreter();

