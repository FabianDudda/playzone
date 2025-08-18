● Excellent choice! Since you're early in development, Option 2 (Normalized Approach) will give you the cleanest, most maintainable
  structure long-term. Here's the complete plan:

  Option 2: Normalized Database Structure

  Database Schema Changes:

  1. Enhanced Courts Table

  -- Keep existing courts table, make sports array optional since we'll normalize it
  ALTER TABLE courts
  ALTER COLUMN sports DROP NOT NULL; -- Make optional since we'll use court_sports table

  -- Add source tracking and location details
  ALTER TABLE courts
  ADD COLUMN source TEXT NOT NULL DEFAULT 'user_added',
  ADD COLUMN source_id TEXT,
  ADD COLUMN district TEXT,
  ADD COLUMN neighborhood TEXT,
  ADD COLUMN area TEXT,
  ADD COLUMN features TEXT[],
  ADD COLUMN import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

  2. New Court Sports Table

  CREATE TABLE court_sports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    court_id UUID REFERENCES courts(id) ON DELETE CASCADE NOT NULL,
    sport sport_type NOT NULL,
    quantity INTEGER DEFAULT 1,
    surface TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(court_id, sport) -- One record per sport per court
  );

  3. Indexes for Performance

  CREATE INDEX court_sports_court_id_idx ON court_sports(court_id);
  CREATE INDEX court_sports_sport_idx ON court_sports(sport);
  CREATE INDEX courts_source_idx ON courts(source);
  CREATE INDEX courts_district_idx ON courts(district);
  CREATE INDEX courts_location_idx ON courts USING gist(ll_to_earth(latitude, longitude));

  Benefits of This Approach:

  ✅ Properly Normalized - No redundant sport data✅ Rich Sport Details - Quantity, surface, notes per sport✅ Flexible Queries - Easy to
  filter by sport characteristics✅ Source Tracking - Track city imports vs user additions✅ Performance - Efficient joins and queries✅
  Extensible - Easy to add sport-specific fields✅ Data Integrity - Foreign key constraints ensure consistency

  Python Script Integration:

  # Your transformation script would:
  def insert_court_with_sports(court_data, sports_data):
      # 1. Insert main court
      court_result = supabase.table('courts').insert({
          'name': court_data['name'],
          'latitude': court_data['latitude'],
          'longitude': court_data['longitude'],
          'description': court_data['description'],
          'source': 'city_cologne',
          'source_id': court_data['original_id'],
          'district': court_data['district'],
          'neighborhood': court_data['neighborhood'],
          'features': court_data['features']
          # sports array can be null/empty since we use court_sports table
      }).execute()

      court_id = court_result.data[0]['id']

      # 2. Insert sport details
      sport_records = []
      for sport in sports_data:
          sport_records.append({
              'court_id': court_id,
              'sport': sport['type'],
              'quantity': sport['quantity'],
              'surface': sport['surface'],
              'notes': sport['notes']
          })

      supabase.table('court_sports').insert(sport_records).execute()

  Frontend Code Changes Needed:

  Updated Database Service

  // New function to get courts with sport details
  async getAllCourtsWithSports(): Promise<CourtWithSports[]> {
    const { data, error } = await supabase
      .from('courts')
      .select(`
        *,
        court_sports (
          sport,
          quantity,
          surface,
          notes
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  Updated TypeScript Types

  export interface CourtSport {
    sport: SportType
    quantity: number
    surface?: string
    notes?: string
  }

  export interface CourtWithSports extends Court {
    court_sports: CourtSport[]
    source: string
    district?: string
    neighborhood?: string
    features?: string[]
  }