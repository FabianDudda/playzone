# Court & Sports League Web App - MVP Concept

## Overview
A web application where users can find, add, and track sports courts, log matches, and maintain an Elo-based ranking system. The app should be simple, interactive, and extendable for tournaments and teams later.

## Tech Stack

### Frontend
- **Framework**: Next.js (latest version, using App Router)
- **UI Library**: shadcn/ui (Tailwind-based, modular components)
- **Routing**: Next.js App Router
- **State Management**: React Query for server state
- **Map Integration**: Leaflet with OpenStreetMap (free, no API key required)
- **Styling**: Tailwind CSS
- **PWA**: Progressive Web App ready

### Backend
- **Platform**: Supabase
- **Auth**: Email / Google / Apple login
- **Database**: PostgreSQL
- **Realtime**: Optional for live ranking updates
- **Edge Functions**: Elo calculation, tournament updates

## Database Schema

### Users Table (Profiles)
```sql
profiles {
  id: uuid (primary key, references auth.users)
  name: text
  avatar: text (url)
  elo: jsonb {
    tennis: 1500,
    basketball: 1500,
    volleyball: 1500,
    spikeball: 1500,
    badminton: 1500,
    squash: 1500,
    pickleball: 1500
  }
  created_at: timestamp
  updated_at: timestamp
}
```

### Places Table (Locations/Facilities)
```sql
places {
  id: uuid (primary key)
  name: text
  latitude: float8
  longitude: float8
  description: text
  image_url: text (optional)
  added_by_user: uuid (foreign key -> profiles.id)
  
  -- Enhanced location tracking
  source: text (default: 'user_added')
  source_id: text (for city imports)
  district: text
  neighborhood: text
  area: text
  features: text[] (amenities, facilities)
  
  -- Legacy compatibility
  sports: sport_type[] (optional, for backward compatibility)
  
  created_at: timestamp
  import_date: timestamp (default: now())
}
```

### Courts Table (Individual Sports Courts)
```sql
courts {
  id: uuid (primary key)
  place_id: uuid (foreign key -> places.id)
  sport: sport_type (enum)
  quantity: integer (default: 1)
  surface: text (clay, grass, hardcourt, etc.)
  notes: text
  created_at: timestamp
  
  UNIQUE(place_id, sport) -- One record per sport per place
}
```

### Matches Table
```sql
matches {
  id: uuid (primary key)
  court_id: uuid (foreign key -> courts.id)
  sport: sport_type (enum)
  team_a_players: uuid[] (foreign keys -> profiles.id)
  team_b_players: uuid[] (foreign keys -> profiles.id)
  winner: match_result ('team_a' | 'team_b' | 'draw')
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

### 1. Place & Court Discovery
- **Interactive Map**: Leaflet map with sport-colored place markers
- **Place Details**: Popups with place information and available courts
- **Sport-Specific Colors**: Visual markers for each sport (tennis=green, basketball=amber, etc.)
- **Filtering**: By sport type, city, or facility features
- **Search**: Text-based place and court search
- **Court Details**: Individual sport courts with surface type, quantity, and notes

### 2. Add New Place & Courts
- **Map Interaction**: Drop pin on map location
- **Place Input**: Facility name, description, location details
- **Court Management**: Add multiple sports courts per place
- **Enhanced Data**: Surface types, court quantities, special features
- **Image Upload**: Optional place images
- **Validation**: Ensure required fields are filled

### 3. Match Logging
- **Player Selection**: Choose participants for teams
- **Score Entry**: Optional score tracking
- **Court Association**: Link match to specific court within a place
- **Surface Context**: Track matches on different court surfaces
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
5. Create normalized database schema (Profiles, Places, Courts, Matches tables)
6. Set up Supabase client configuration with new schema
7. Configure authentication with email/Google providers
8. Implement Row Level Security (RLS) policies for all tables
9. Create database functions for Elo calculations and leaderboards

### Phase 3: Core UI Components & Layout
10. Install essential shadcn/ui components
11. Create main layout with navigation
12. Build responsive mobile-first design
13. Implement protected route wrapper

### Phase 4: Match Logging & Elo System
14. Build match creation flow with court selection
15. Implement Elo calculation engine
16. Create match history display
17. Add player selection interface

### Phase 5: Ranking & Leaderboards
18. Build leaderboard components
19. Create user profile pages
20. Implement sport-specific rankings
21. Add filtering and search functionality

### Phase 6: Map Integration & Place Discovery ✅ COMPLETED
22. Integrate Leaflet with OpenStreetMap (free alternative)
23. Create sport-colored interactive place markers
24. Build place detail popups with court information
25. Implement add new places with map pin dropping
26. Add user location finding and custom marker styles
27. Create tabbed view system (Map/List/Both views)

### Phase 7: PWA & Polish
28. Configure service worker for PWA
29. Add offline functionality basics
30. Create app manifest for installability
31. Implement loading states and error handling

## Database Architecture Benefits

### Normalized Structure Advantages
- **Proper Data Modeling**: Places represent physical locations, courts represent individual playing areas
- **Rich Sport Details**: Each court can have specific surface type, quantity, and notes
- **Flexible Queries**: Easy to filter by sport characteristics, surface types, or facility features
- **Source Tracking**: Distinguish between user-added places and city-imported data
- **Extensibility**: Easy to add sport-specific fields or new facility types
- **Data Integrity**: Foreign key constraints ensure consistent relationships

### Support for Future Features
- **Sports Clubs**: Places can represent club facilities with multiple courts
- **Commercial Facilities**: Pricing, hours, and membership information
- **City Integrations**: Bulk import of municipal sports facilities
- **Enhanced Filtering**: By surface type, availability, features, or location details

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