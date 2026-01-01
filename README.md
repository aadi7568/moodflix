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
- 🎯 **Smart Recommendations** - AI-powered movie suggestions based on your selected mood and genre preferences
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

# OpenAI API Key (Optional - for future AI features)
OPENAI_API_KEY=your_openai_api_key_here
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

## 📁 Project Structure

```
moodflix/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── recommendations/    # POST endpoint for mood-based recommendations
│   │   │   ├── trending/           # GET endpoint for trending content
│   │   │   └── mood-analysis/      # Future AI analysis endpoint
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
│   │   ├── ai-service.ts           # Future AI service integration
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
- [Next.js](https://nextjs.org/) team for the amazing framework
- [Vercel](https://vercel.com/) for hosting and deployment platform

## 📧 Support

If you encounter any issues or have questions:

- Open an issue on [GitHub](https://github.com/yourusername/moodflix/issues)
- Check the [documentation](https://github.com/yourusername/moodflix/wiki)

---

Made with ❤️ by [Your Name]
