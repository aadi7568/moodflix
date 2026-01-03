import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'MoodFlix - Movie Recommendations Based on Your Mood',
    template: '%s | MoodFlix',
  },
  description: 'Discover the perfect movies and TV shows that match how you\'re feeling right now. MoodFlix uses AI-powered mood analysis to curate personalized entertainment recommendations.',
  keywords: ['movies', 'TV shows', 'recommendations', 'mood', 'entertainment', 'streaming', 'TMDB'],
  authors: [{ name: 'MoodFlix Team' }],
  creator: 'MoodFlix',
  publisher: 'MoodFlix',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'MoodFlix - Movie Recommendations Based on Your Mood',
    description: 'Discover the perfect movies and TV shows that match how you\'re feeling right now.',
    siteName: 'MoodFlix',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MoodFlix - Movie Recommendations',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MoodFlix - Movie Recommendations Based on Your Mood',
    description: 'Discover the perfect movies and TV shows that match how you\'re feeling right now.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className="antialiased scroll-smooth">
        {children}
      </body>
    </html>
  );
}
