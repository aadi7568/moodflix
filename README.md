# 🎬 MoodFlix

**Movie Recommendations Based on Your Mood**

Discover the perfect movies and TV shows that match how you're feeling right now. MoodFlix uses AI-powered mood analysis and The Movie Database (TMDB) to curate personalized entertainment recommendations.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38bdf8?style=flat-square&logo=tailwind-css)

## ✨ Features

- 🎭 **10 Mood Presets** - Choose from happy, sad, excited, relaxed, romantic, adventurous, scared, thoughtful, energetic, or nostalgic
- 🎨 **Beautiful UI** - Modern, responsive design with smooth animations powered by Framer Motion
- 🌙 **Dark Mode Support** - Automatic dark mode with seamless theme switching
- 🎯 **AI-Powered Emotional Re-ranking** - Advanced AI analyzes movie emotional tones and re-ranks recommendations based on nuanced mood matching (e.g., "bittersweet happy", "calm but hopeful")
- 🧠 **Smart Recommendations** - Intelligent movie suggestions that understand emotional nuance, not just genre
- 📱 **Fully Responsive** - Works perfectly on mobile, tablet, and desktop devices
- ⚡ **Fast Performance** - Built with Next.js 14 App Router for optimal performance
- 🎬 **TMDB Integration** - Access to millions of movies and TV shows from The Movie Database
- 🔍 **Trending Content** - Discover what's popular right now
- 💫 **Smooth Animations** - Delightful user experience with Framer Motion animations

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Utilities**: [clsx](https://github.com/lukeed/clsx) & [tailwind-merge](https://github.com/dcastil/tailwind-merge)
- **API**: [The Movie Database (TMDB)](https://www.themoviedb.org/)
- **AI**: [Google Gemini](https://ai.google.dev/) (Gemini 1.5 Flash for emotional tone analysis)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.17 or later ([Download](https://nodejs.org/))
- **npm** 9.0 or later (comes with Node.js)
- **Git** (optional, for cloning the repository)

You can check your versions by running:

```bash
node --version
npm --version
```

## 🚀 Installation

1. **Clone the repository** (or download and extract the project):

```bash
git clone https://github.com/yourusername/moodflix.git
cd moodflix
```

2. **Install dependencies**:

```bash
npm install
```

3. **Set up environment variables** (see [Environment Variables](#-environment-variables) section below)

4. **Run the development server**:

```bash
npm run dev
```

5. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

## 🔑 Getting a TMDB API Key

The Movie Database (TMDB) provides a free API key for developers. Follow these steps:

1. **Visit TMDB**: Go to [https://www.themoviedb.org/](https://www.themoviedb.org/)

2. **Create an Account**:
   - Click "Sign Up" in the top right corner
   - Fill in your details and verify your email address

3. **Request API Key**:
   - Once logged in, go to your account settings
   - Navigate to the "API" section in the left sidebar
   - Click "Request an API Key"

4. **Fill Out the Application Form**:
   - **Application Type**: Select "Developer"
   - **Application Name**: Enter "MoodFlix" (or your preferred name)
   - **Application URL**: Enter `http://localhost:3000` (for development)
   - **Application Summary**: Describe your project (e.g., "A mood-based movie recommendation app")
   - Accept the Terms of Use and API Terms of Use

5. **Get Your API Key**:
   - After submitting, you'll receive your API key (v3 auth)
   - Copy this key - you'll need it for the next step

6. **Optional - Get Read Access Token**:
   - For additional features, you can also request a Read Access Token
   - This is optional and not required for basic functionality

## 🔐 Environment Variables

Create a `.env.local` file in the root directory of the project:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your API keys:

```env
# TMDB API Key (Required)
TMDB_API_KEY=your_tmdb_api_key_here

# App URL (Optional - for production)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Gemini API Key (Required for AI re-ranking feature)
# Get your API key from https://ai.google.dev/
GEMINI_API_KEY=your_gemini_api_key_here

# Enable/Disable AI Re-ranking (Optional, default: true)
# Set to "false" to disable AI re-ranking and use genre-based sorting only
ENABLE_AI_RERANKING=true
```

**Important**: 
- Never commit `.env.local` to version control (it's already in `.gitignore`)
- The `.env.local.example` file shows the required format without sensitive data

## 💻 Development

### Running the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

The page will automatically reload when you make changes to the code.

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server (after building)
- `npm run lint` - Run ESLint to check for code issues

## 🏗️ Building for Production

1. **Build the application**:

```bash
npm run build
```

2. **Start the production server**:

```bash
npm start
```

The production build will be optimized and ready for deployment.

## 🚢 Deployment

### Deploying to Vercel (Recommended)

Vercel is the easiest way to deploy Next.js applications:

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import your project to Vercel**:
   - Go to [https://vercel.com](https://vercel.com)
   - Sign up or log in with your GitHub account
   - Click "Add New Project"
   - Import your MoodFlix repository

3. **Configure Environment Variables**:
   - In the Vercel project settings, go to "Environment Variables"
   - Add your `TMDB_API_KEY`:
     - **Key**: `TMDB_API_KEY`
     - **Value**: Your TMDB API key
     - **Environment**: Production, Preview, and Development
   - Add `NEXT_PUBLIC_APP_URL` if needed:
     - **Key**: `NEXT_PUBLIC_APP_URL`
     - **Value**: Your production URL (e.g., `https://moodflix.vercel.app`)

4. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy your application
   - Your app will be live at `https://your-project.vercel.app`

5. **Update TMDB API Settings** (Optional):
   - Go back to your TMDB account settings
   - Update your API application URL to your Vercel domain

### Other Deployment Options

You can also deploy to:
- **Netlify**: Similar process to Vercel
- **AWS Amplify**: For AWS-based deployments
- **Railway**: Simple deployment platform
- **Self-hosted**: Using Docker or a Node.js server

## 🤖 AI-Powered Emotional Re-ranking

MoodFlix uses advanced AI to analyze the emotional tone of movies and re-rank recommendations based on nuanced mood matching, not just genre filters.

### How It Works

1. **Emotional Tone Analysis**: When you select a mood, the AI analyzes each movie's emotional tone, atmosphere, and nuanced characteristics (e.g., "bittersweet happy", "calm but hopeful").

2. **Smart Re-ranking**: Movies are scored (0-100) based on:
   - Primary emotion match with your selected mood
   - Secondary emotions alignment
   - Nuanced tone matching (distinguishes "bittersweet happy" from just "happy")
   - Exclusion penalties (e.g., dark movies are heavily penalized for "Relaxed" mood)

3. **Tone Mismatch Prevention**: The system actively avoids tone mismatches. For example, when you're in a "Relaxed" mood, it excludes movies with dark, intense, or disturbing tones.

### Examples of Nuanced Matching

- **"Happy" mood**: Matches "bittersweet happy", "uplifting", "joyful but not overly saccharine"
- **"Relaxed" mood**: Matches "calm but hopeful", "soothing", "peaceful" - excludes "dark", "intense", "disturbing"
- **"Sad" mood**: Matches "melancholic but uplifting", "cathartic", "bittersweet"

### Enabling/Disabling AI Re-ranking

AI re-ranking is enabled by default. To disable it and use genre-based sorting only:

```env
ENABLE_AI_RERANKING=false
```

### Cost Considerations

- Uses Google's Gemini 1.5 Flash model for cost efficiency
- Implements intelligent caching (7-day TTL) to avoid re-analyzing the same movies
- Processes movies in batches to optimize API calls
- Falls back to genre-based sorting if AI service is unavailable

### Troubleshooting

**AI re-ranking not working?**
- Check that `GEMINI_API_KEY` is set in your `.env.local` file
- Get your API key from [Google AI Studio](https://ai.google.dev/)
- Verify the API key is valid and has sufficient quota
- Check server logs for error messages
- The system will automatically fall back to genre-based sorting if AI fails

**Slow recommendations?**
- First-time analysis may take 10-30 seconds for 20-30 movies
- Subsequent requests are faster due to caching
- Consider reducing the number of movies analyzed (currently limited to top 30)

**Debug Endpoint** (Development only):
- Visit `/api/debug/ai-cache` to view cache statistics and AI service status

## 📁 Project Structure

```
moodflix/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── recommendations/    # POST endpoint for mood-based recommendations
│   │   │   ├── trending/           # GET endpoint for trending content
│   │   │   ├── mood-analysis/      # AI analysis endpoint
│   │   │   └── debug/              # Debug endpoints (development only)
│   │   ├── layout.tsx              # Root layout with metadata and fonts
│   │   ├── page.tsx                # Main landing page
│   │   └── globals.css             # Global styles
│   ├── components/
│   │   ├── ui/                     # Reusable UI components
│   │   ├── MoodSelector.tsx        # Mood selection component
│   │   ├── MovieCard.tsx           # Movie card display component
│   │   └── RecommendationList.tsx # Recommendations list component
│   ├── lib/
│   │   ├── tmdb.ts                 # TMDB API service
│   │   ├── ai-service.ts           # AI service for emotional tone analysis and re-ranking
│   │   └── utils.ts                 # Utility functions
│   ├── types/
│   │   ├── movie.ts                # Movie-related TypeScript types
│   │   └── mood.ts                 # Mood-related TypeScript types
│   └── config/
│       └── moods.ts                # Mood presets configuration
├── public/                         # Static assets
├── .env.local.example              # Environment variables template
├── .gitignore                      # Git ignore rules
├── next.config.mjs                 # Next.js configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Dependencies and scripts
```

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute to MoodFlix:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add some amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

Please ensure your code follows the existing style and includes appropriate tests/documentation.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for providing the movie data API
- [Google Gemini](https://ai.google.dev/) for AI-powered emotional tone analysis
- [Next.js](https://nextjs.org/) team for the amazing framework
- [Vercel](https://vercel.com/) for hosting and deployment platform

## 📧 Support

If you encounter any issues or have questions:

- Open an issue on [GitHub](https://github.com/yourusername/moodflix/issues)
- Check the [documentation](https://github.com/yourusername/moodflix/wiki)

---

Made with ❤️ by [Your Name]
