# Court Sports - Web App MVP

A comprehensive web application for discovering sports courts, logging matches, and tracking Elo-based rankings across multiple sports.

## Features

### 🏟️ Court Discovery
- Interactive Mapbox map with court markers
- Filter courts by sport type
- Search courts by name and description
- Add new courts with location pinning

### 🎯 Match Logging
- Log match results between teams of any size
- Automatic Elo rating updates
- Preview Elo changes before match creation
- Support for multiple sports

### 🏆 Elo Ranking System
- Dynamic K-factor based on team size (Singles: ±32, Small teams: ±26, Large teams: ±18)
- Sport-specific leaderboards
- Match history tracking
- Personal statistics and progression

### 👥 User Management
- Email and Google authentication via Supabase
- User profiles with Elo ratings per sport
- Match history and statistics

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: shadcn/ui with Tailwind CSS
- **State Management**: TanStack React Query
- **Maps**: Mapbox GL JS
- **Icons**: Lucide React

### Backend
- **Platform**: Supabase
- **Database**: PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth (Email, Google)
- **Real-time**: Supabase Realtime subscriptions

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Mapbox account (for map functionality)

### Environment Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   
   Copy `.env.local.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Required environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
   ```

### Supabase Setup

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)

2. **Run the database schema**
   
   Execute the SQL commands in `supabase-schema.sql` in your Supabase SQL editor. This will create:
   - Database tables (profiles, courts, matches, match_participants)
   - Elo calculation functions
   - Row Level Security policies
   - Database triggers and functions

3. **Configure Authentication**
   
   In your Supabase dashboard:
   - Go to Authentication > Settings
   - Configure email authentication
   - Set Site URL to `http://localhost:3000` for development
   - For production, set Site URL to your domain (e.g., `https://yourdomain.com`)

4. **Configure Google OAuth (Optional)**
   
   a. **Create Google OAuth App**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to "Credentials" > "Create Credentials" > "OAuth 2.0 Client ID"
   - Set Application type to "Web application"
   - Add authorized origins:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - Add authorized redirect URIs:
     - `https://your-supabase-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret

   b. **Configure in Supabase**:
   - In Supabase dashboard, go to Authentication > Providers
   - Enable Google provider
   - Enter your Google Client ID and Client Secret
   - Save configuration

### Mapbox Setup

1. **Create a Mapbox account** at [mapbox.com](https://mapbox.com)
2. **Get your access token** from the Mapbox dashboard
3. **Add the token** to your `.env.local` file

### Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── courts/            # Court discovery and management
│   ├── matches/           # Match logging and history
│   └── rankings/          # Leaderboards and rankings
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout components
│   ├── map/              # Map components
│   └── providers/        # Context providers
└── lib/                  # Utility libraries
    ├── supabase/         # Database client and types
    └── elo/              # Elo calculation system
```

## Key Components

### Elo Rating System
- **Calculator**: Pure functions for Elo calculations (`src/lib/elo/calculator.ts`)
- **Match Service**: Handles match creation and Elo updates (`src/lib/elo/match-service.ts`)
- **K-Factor Logic**: Dynamic rating changes based on team size

### Database Schema
- **Profiles**: User data with sport-specific Elo ratings
- **Courts**: Sports venues with location and sport types
- **Matches**: Game records with teams and results
- **Match Participants**: Individual player performance tracking

### Authentication Flow
- Supabase Auth integration with automatic profile creation
- Row Level Security for data protection
- Session management with React Context

## Supported Sports

- Tennis
- Basketball  
- Volleyball
- Spikeball
- Badminton
- Squash
- Pickleball

## Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Add environment variables** in the Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy your app

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Heroku
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
