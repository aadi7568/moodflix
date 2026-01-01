import { MoodType, Mood } from '../types/mood';

export const MOODS: Record<MoodType, Mood> = {
  happy: {
    id: 'happy',
    label: 'Happy',
    emoji: '😊',
    color: 'bg-yellow-500',
    description: 'Uplifting and feel-good content',
    genrePreferences: [35, 10751, 16, 10402], // Comedy, Family, Animation, Music
  },
  sad: {
    id: 'sad',
    label: 'Sad',
    emoji: '😢',
    color: 'bg-blue-500',
    description: 'Emotional and touching stories',
    genrePreferences: [18, 10749], // Drama, Romance
  },
  excited: {
    id: 'excited',
    label: 'Excited',
    emoji: '🤩',
    color: 'bg-orange-500',
    description: 'High-energy and thrilling',
    genrePreferences: [28, 12, 878], // Action, Adventure, Sci-Fi
  },
  relaxed: {
    id: 'relaxed',
    label: 'Relaxed',
    emoji: '😌',
    color: 'bg-green-500',
    description: 'Calm and soothing content',
    genrePreferences: [99, 36, 10751], // Documentary, History, Family
  },
  romantic: {
    id: 'romantic',
    label: 'Romantic',
    emoji: '💕',
    color: 'bg-pink-500',
    description: 'Love stories and romantic comedies',
    genrePreferences: [10749, 35], // Romance, Comedy
  },
  adventurous: {
    id: 'adventurous',
    label: 'Adventurous',
    emoji: '🗺️',
    color: 'bg-purple-500',
    description: 'Epic journeys and explorations',
    genrePreferences: [12, 14, 28], // Adventure, Fantasy, Action
  },
  scared: {
    id: 'scared',
    label: 'Scared',
    emoji: '😱',
    color: 'bg-red-500',
    description: 'Horror and suspenseful thrillers',
    genrePreferences: [27, 53, 9648], // Horror, Thriller, Mystery
  },
  thoughtful: {
    id: 'thoughtful',
    label: 'Thoughtful',
    emoji: '🤔',
    color: 'bg-indigo-500',
    description: 'Mind-bending and philosophical',
    genrePreferences: [878, 9648, 18], // Sci-Fi, Mystery, Drama
  },
  energetic: {
    id: 'energetic',
    label: 'Energetic',
    emoji: '⚡',
    color: 'bg-yellow-600',
    description: 'Fast-paced and action-packed',
    genrePreferences: [28, 80, 53], // Action, Crime, Thriller
  },
  nostalgic: {
    id: 'nostalgic',
    label: 'Nostalgic',
    emoji: '📼',
    color: 'bg-amber-600',
    description: 'Classic and timeless favorites',
    genrePreferences: [18, 10749, 35], // Drama, Romance, Comedy
  },
};

