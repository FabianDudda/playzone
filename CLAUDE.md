# Court Sports App - Project Analysis

## Overview
This is a comprehensive web application for discovering sports courts, logging matches, and tracking Elo-based rankings across multiple sports. The app is built with Next.js 15 and uses Supabase as the backend platform.

## Architecture

### Frontend Stack
- **Framework**: Next.js 15 with App Router
- **UI Library**: shadcn/ui components with Tailwind CSS
- **State Management**: TanStack React Query for server state
- **Maps**: Leaflet with React-Leaflet for interactive mapping
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **Typography**: Geist fonts (sans and mono)

### Backend Stack
- **Platform**: Supabase
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth (Email + Google OAuth)
- **Real-time**: Supabase Realtime subscriptions

## Key Features

### 1. Sports Court Discovery 🏟️
- Interactive Leaflet map with court markers
- Sport-specific filtering and clustering
- Court search by name and description
- Add new courts with location pinning
- Multiple map layers (Street, Satellite, etc.)

### 2. Match Logging & Elo System 🎯
- Log match results between teams of any size
- Dynamic Elo rating system with sport-specific calculations
- K-factor adjustments based on team size:
  - Singles (1v1): K = 32
  - Small teams (2-3): K = 26
  - Large teams (4+): K = 18
- Match history tracking with detailed statistics

### 3. Rankings & Leaderboards 🏆
- Sport-specific leaderboards
- Personal Elo progression tracking
- Match participation statistics
- User profiles with performance history

## Database Schema

### Core Tables
- **profiles**: User data with sport-specific Elo ratings
- **places**: Sports venues with location and metadata
- **courts**: Individual courts within places, sport-specific
- **matches**: Game records with teams and results
- **match_participants**: Individual player performance tracking

### Key Database Features
- Row Level Security (RLS) policies for data protection
- Custom PostgreSQL functions for Elo calculations
- Automatic profile creation on user registration
- Comprehensive match history tracking

## Supported Sports
- Tennis, Basketball, Volleyball, Spikeball
- Badminton, Squash, Pickleball
- German sports: Fußball, Tischtennis, Boule, Skatepark

## Development Commands

### Available Scripts
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run import-places` - Import places data script

### Linting & Type Checking
- **Linting**: `npm run lint` (Next.js ESLint config)
- **Type Checking**: Built into Next.js build process
- **Code Quality**: TypeScript strict mode enabled

## Key Components

### Authentication (`src/components/auth/`)
- `auth-provider.tsx` - Supabase auth context provider
- `admin-guard.tsx` - Admin route protection

### Map System (`src/components/map/`)
- `leaflet-court-map.tsx` - Main interactive map component
- `marker-cluster-group.tsx` - Court clustering functionality
- `cluster-styles.css` - Custom cluster styling

### UI Components (`src/components/ui/`)
- Full shadcn/ui component library
- Consistent design system with Tailwind CSS
- Accessible components with proper ARIA support

### Business Logic (`src/lib/`)
- `elo/calculator.ts` - Pure Elo calculation functions
- `elo/match-service.ts` - Match creation and Elo updates
- `supabase/` - Database client and type definitions
- `utils/` - Utility functions for sports, maps, performance

## File Structure Highlights

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (geocoding, debug)
│   ├── auth/              # Authentication pages
│   ├── map/               # Map and court discovery
│   ├── matches/           # Match logging
│   ├── places/            # Individual court details
│   ├── profile/           # User profiles
│   └── rankings/          # Leaderboards
├── components/            # React components
├── hooks/                 # Custom React hooks
└── lib/                   # Business logic and utilities
```

## Data Import System
- Script for importing official sports facility data
- Support for multiple German cities (Bonn, Cologne, Dormagen, Dortmund)
- Geocoding integration for address enrichment
- Automated data processing pipeline

## Performance Optimizations
- Marker clustering for large datasets
- Object pooling for map markers
- Performance monitoring utilities
- Debounced search functionality
- Code splitting with Next.js

## Security Features
- Row Level Security (RLS) on all database tables
- Secure API endpoints with user authentication
- Protected routes with admin guards
- Environment variable management
- No hard-coded secrets or API keys

## Development Notes
- Uses TypeScript strict mode throughout
- Follows Next.js 15 App Router conventions
- Implements proper error boundaries and loading states
- Responsive design with mobile-first approach
- Accessibility considerations in UI components

## Environment Requirements
- Node.js 18+
- Supabase project setup
- Mapbox access token (for legacy compatibility, now uses Leaflet)
- Environment variables for API keys and database URLs