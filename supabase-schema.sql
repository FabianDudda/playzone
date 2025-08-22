-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create custom types
create type sport_type as enum ('tennis', 'basketball', 'volleyball', 'spikeball', 'badminton', 'squash', 'pickleball');
create type match_result as enum ('team_a', 'team_b', 'draw');

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  avatar text,
  user_role text not null default 'user' check (user_role in ('user', 'admin')),
  elo jsonb not null default '{
    "tennis": 1500,
    "basketball": 1500,
    "volleyball": 1500,
    "spikeball": 1500,
    "badminton": 1500,
    "squash": 1500,
    "pickleball": 1500
  }'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Courts table
create table public.courts (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  latitude float8 not null,
  longitude float8 not null,
  sports sport_type[] not null,
  description text,
  image_url text,
  added_by_user uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Matches table
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  court_id uuid references public.courts(id) on delete set null,
  sport sport_type not null,
  team_a_players uuid[] not null,
  team_b_players uuid[] not null,
  winner match_result not null,
  score jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Match participants table (for tracking individual Elo changes)
create table public.match_participants (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references public.matches(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team text not null check (team in ('team_a', 'team_b')),
  elo_before integer not null,
  elo_after integer not null,
  elo_change integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for better performance
create index courts_location_idx on public.courts using gist (
  ll_to_earth(latitude, longitude)
);
create index courts_sport_idx on public.courts using gin (sports);
create index matches_court_idx on public.matches(court_id);
create index matches_sport_idx on public.matches(sport);
create index matches_created_at_idx on public.matches(created_at desc);
create index match_participants_user_idx on public.match_participants(user_id);
create index match_participants_match_idx on public.match_participants(match_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.courts enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Authenticated users can update profiles" on public.profiles
  for update using (auth.role() = 'authenticated')
  with check (
    -- Allow users to update their own profile completely
    auth.uid() = id OR
    -- Allow updating Elo only if other fields remain unchanged (for match creation)
    (
      COALESCE(OLD.name, '') = COALESCE(NEW.name, '') AND
      COALESCE(OLD.avatar, '') = COALESCE(NEW.avatar, '') AND
      OLD.created_at = NEW.created_at AND
      OLD.updated_at <= NEW.updated_at
    )
  );

-- Courts policies
create policy "Courts are viewable by everyone" on public.courts
  for select using (true);

create policy "Authenticated users can insert courts" on public.courts
  for insert with check (auth.role() = 'authenticated');

create policy "Users can update their own courts" on public.courts
  for update using (auth.uid() = added_by_user);

create policy "Users can delete their own courts" on public.courts
  for delete using (auth.uid() = added_by_user);

-- Matches policies
create policy "Matches are viewable by everyone" on public.matches
  for select using (true);

create policy "Authenticated users can insert matches" on public.matches
  for insert with check (auth.role() = 'authenticated');

-- Match participants policies
create policy "Match participants are viewable by everyone" on public.match_participants
  for select using (true);

create policy "Authenticated users can insert match participants" on public.match_participants
  for insert with check (auth.role() = 'authenticated');

-- Functions

-- Function to automatically create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at on profiles
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Function to calculate Elo rating
create or replace function public.calculate_elo_change(
  current_elo integer,
  opponent_elo integer,
  won boolean,
  k_factor integer default 32
)
returns integer as $$
declare
  expected_score float;
  actual_score integer;
begin
  expected_score := 1.0 / (1.0 + power(10.0, (opponent_elo - current_elo)::float / 400.0));
  actual_score := case when won then 1 else 0 end;
  return round(k_factor * (actual_score - expected_score));
end;
$$ language plpgsql immutable;

-- Function to get K-factor based on team size
create or replace function public.get_k_factor(team_size integer)
returns integer as $$
begin
  case
    when team_size = 1 then return 32;
    when team_size between 2 and 3 then return 26;
    else return 18;
  end case;
end;
$$ language plpgsql immutable;

-- Function to get current leaderboard for a sport
create or replace function public.get_leaderboard(sport_name text default null, limit_count integer default 50)
returns table(
  user_id uuid,
  name text,
  avatar text,
  elo integer,
  matches_played bigint,
  rank bigint
) as $$
begin
  return query
  select 
    p.id as user_id,
    p.name,
    p.avatar,
    case 
      when sport_name is not null then (p.elo->>sport_name)::integer
      else greatest(
        (p.elo->>'tennis')::integer,
        (p.elo->>'basketball')::integer,
        (p.elo->>'volleyball')::integer,
        (p.elo->>'spikeball')::integer,
        (p.elo->>'badminton')::integer,
        (p.elo->>'squash')::integer,
        (p.elo->>'pickleball')::integer
      )
    end as elo,
    coalesce(match_counts.matches_played, 0) as matches_played,
    row_number() over (
      order by 
        case 
          when sport_name is not null then (p.elo->>sport_name)::integer
          else greatest(
            (p.elo->>'tennis')::integer,
            (p.elo->>'basketball')::integer,
            (p.elo->>'volleyball')::integer,
            (p.elo->>'spikeball')::integer,
            (p.elo->>'badminton')::integer,
            (p.elo->>'squash')::integer,
            (p.elo->>'pickleball')::integer
          )
        end desc
    ) as rank
  from public.profiles p
  left join (
    select 
      mp.user_id,
      count(*) as matches_played
    from public.match_participants mp
    where sport_name is null or exists (
      select 1 from public.matches m 
      where m.id = mp.match_id and m.sport::text = sport_name
    )
    group by mp.user_id
  ) match_counts on p.id = match_counts.user_id
  order by elo desc
  limit limit_count;
end;
$$ language plpgsql;