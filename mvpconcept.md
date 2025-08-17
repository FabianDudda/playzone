# Court & Sports League Web App - MVP Concept

## Overview
A web application where users can find, add, and track sports courts, log matches, and maintain an Elo-based ranking system. The app should be simple, interactive, and extendable for tournaments and teams later.

## Tech Stack

### Frontend
- **Framework**: Next.js (latest version, using App Router)
- **UI Library**: shadcn/ui (Tailwind-based, modular components)
- **Routing**: Next.js App Router
- **State Management**: React Query for server state
- **Map Integration**: Mapbox GL JS
- **Styling**: Tailwind CSS
- **PWA**: Progressive Web App ready

### Backend
- **Platform**: Supabase
- **Auth**: Email / Google / Apple login
- **Database**: PostgreSQL
- **Realtime**: Optional for live ranking updates
- **Edge Functions**: Elo calculation, tournament updates

## Database Schema

### Users Table
```sql
users {
  id: uuid (primary key)
  name: text
  email: text (unique)
  avatar: text (url)
  elo: jsonb {
    tennis: 1500,
    basketball: 1500,
    volleyball: 1500,
    spikeball: 1500
  }
  created_at: timestamp
  updated_at: timestamp
}
```

### Courts Table
```sql
courts {
  id: uuid (primary key)
  name: text
  latitude: float8
  longitude: float8
  sport: text[]
  description: text
  added_by_user: uuid (foreign key -> users.id)
  image_url: text (optional)
  created_at: timestamp
}
```

### Matches Table
```sql
matches {
  id: uuid (primary key)
  court_id: uuid (foreign key -> courts.id)
  sport: text
  team_a_players: uuid[] (foreign keys -> users.id)
  team_b_players: uuid[] (foreign keys -> users.id)
  winner: text ('team_a' | 'team_b')
  score: jsonb (optional, flexible format)
  created_at: timestamp
}
```

### Match Participants Table
```sql
match_participants {
  id: uuid (primary key)
  match_id: uuid (foreign key -> matches.id)
  user_id: uuid (foreign key -> users.id)
  team: text ('team_a' | 'team_b')
  elo_before: integer
  elo_after: integer
  elo_change: integer
  created_at: timestamp
}
```

## Core Features

### 1. Court Discovery
- **Interactive Map**: Mapbox map with court markers
- **Court Details**: Popups with court information
- **Filtering**: By sport type or city
- **Search**: Text-based court search

### 2. Add New Court
- **Map Interaction**: Drop pin on map location
- **Form Input**: Court name, sport types, description
- **Image Upload**: Optional court images
- **Validation**: Ensure required fields are filled

### 3. Match Logging
- **Player Selection**: Choose participants for teams
- **Score Entry**: Optional score tracking
- **Court Association**: Link match to specific court
- **Auto Elo Update**: Automatic ranking calculations

### 4. Elo Ranking System
- **Starting Rating**: 1500 points per sport
- **K-Factor Logic**: 
  - Singles (1v1): K = 32
  - Small teams (2-3 players): K = 26
  - Large teams (4+ players): K = 18
- **Team Calculations**: Average team Elo for matchups
- **Match History**: Track all games and Elo changes

### 5. Rankings & Leaderboards
- **Global Rankings**: Across all users
- **Sport-Specific**: Separate rankings per sport
- **City/Regional**: Location-based filtering
- **User Profiles**: Personal stats and history

## Elo Calculation Logic

```python
def calculate_k_factor(team_size):
    if team_size == 1:
        return 32
    elif 2 <= team_size <= 3:
        return 26
    else:
        return 18

def update_team_elo(team_a, team_b, sport, team_a_wins):
    # Calculate team averages
    elo_a = sum([user['elo'][sport] for user in team_a]) / len(team_a)
    elo_b = sum([user['elo'][sport] for user in team_b]) / len(team_b)
    
    # Expected outcomes
    E_a = 1 / (1 + 10 ** ((elo_b - elo_a) / 400))
    E_b = 1 - E_a
    
    # Actual outcomes
    S_a = 1 if team_a_wins else 0
    S_b = 1 - S_a
    
    # Update each player's Elo
    for player in team_a:
        K = calculate_k_factor(len(team_a))
        old_elo = player['elo'][sport]
        new_elo = old_elo + K * (S_a - E_a)
        player['elo'][sport] = new_elo
        
        # Record match history
        player['match_history'].append({
            "sport": sport,
            "opponents": [u['id'] for u in team_b],
            "result": "Win" if S_a == 1 else "Loss",
            "elo_before": old_elo,
            "elo_after": new_elo,
            "elo_change": new_elo - old_elo
        })
```

## Implementation Phases

### Phase 1: Project Setup & Configuration
1. Initialize Next.js project with TypeScript and App Router
2. Configure dependencies (shadcn/ui, Supabase, React Query)
3. Set up Tailwind CSS configuration
4. Install and configure shadcn/ui CLI

### Phase 2: Supabase Backend Setup
5. Create database schema (Users, Courts, Matches tables)
6. Set up Supabase client configuration
7. Configure authentication with email/Google providers
8. Implement Row Level Security (RLS) policies

### Phase 3: Core UI Components & Layout
9. Install essential shadcn/ui components
10. Create main layout with navigation
11. Build responsive mobile-first design
12. Implement protected route wrapper

### Phase 4: Match Logging & Elo System
13. Build match creation flow
14. Implement Elo calculation engine
15. Create match history display
16. Add player selection interface

### Phase 5: Ranking & Leaderboards
17. Build leaderboard components
18. Create user profile pages
19. Implement sport-specific rankings
20. Add filtering and search functionality

### Phase 6: Map Integration & Court Discovery
21. Integrate Mapbox GL JS
22. Create interactive court markers
23. Build court detail popups
24. Implement add new court with map pin dropping

### Phase 7: PWA & Polish
25. Configure service worker for PWA
26. Add offline functionality basics
27. Create app manifest for installability
28. Implement loading states and error handling

## Future Extensions (Post-MVP)

### Teams Feature
- Create and join teams
- Team-based rankings
- Team vs team matches

### Tournaments
- KO bracket tournaments
- Group stage tournaments
- Tournament Elo effects

### Enhanced Features
- Chat/messaging between players
- Court availability scheduling
- Photo sharing from matches
- Achievement system
- Social features (friends, follows)

## Success Metrics
- User registration and retention
- Courts added to platform
- Matches logged per week
- Active players in ranking system
- Mobile usage and PWA installations