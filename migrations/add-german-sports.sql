-- Add German sports to the sport_type enum
-- This migration adds the German sport types that appear in the JSON data

-- First, add new values to the enum
ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'fußball';
ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'tischtennis';
ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'boule';
ALTER TYPE sport_type ADD VALUE IF NOT EXISTS 'skatepark';

-- Update the default elo ratings in profiles to include new sports
-- Note: This affects the default value for new users
UPDATE profiles SET elo = elo || jsonb_build_object(
  'fußball', 1500,
  'tischtennis', 1500, 
  'boule', 1500,
  'skatepark', 1500
) WHERE elo IS NOT NULL;

-- Update the get_leaderboard function to include new sports
CREATE OR REPLACE FUNCTION public.get_leaderboard(sport_name text default null, limit_count integer default 50)
RETURNS table(
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
        (p.elo->>'pickleball')::integer,
        (p.elo->>'fußball')::integer,
        (p.elo->>'tischtennis')::integer,
        (p.elo->>'boule')::integer,
        (p.elo->>'skatepark')::integer
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
            (p.elo->>'pickleball')::integer,
            (p.elo->>'fußball')::integer,
            (p.elo->>'tischtennis')::integer,
            (p.elo->>'boule')::integer,
            (p.elo->>'skatepark')::integer
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