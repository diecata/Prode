-- ==============================================
-- PRODE MUNDIAL 2026 - SUPABASE SCHEMA
-- ==============================================

-- 1. Create Tables

CREATE TABLE IF NOT EXISTS public.groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
    is_admin BOOLEAN DEFAULT false NOT NULL,
    first_name TEXT,
    last_name TEXT,
    total_points INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_order INTEGER NOT NULL,
    phase TEXT NOT NULL,
    group_name TEXT,
    date_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    stadium TEXT,
    city TEXT,
    country TEXT,
    home_score INTEGER,
    away_score INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'finished')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    home_score INTEGER NOT NULL,
    away_score INTEGER NOT NULL,
    points_earned INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, match_id)
);

-- 2. Insert Initial Groups
INSERT INTO public.groups (code, name) VALUES 
('GASENER', 'Grupo Gasener'),
('PRODE2026', 'Prode 2026 General')
ON CONFLICT (code) DO NOTHING;

-- 3. Row Level Security (RLS)
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Policies for groups: everyone can read
CREATE POLICY "Groups are viewable by everyone" ON public.groups FOR SELECT USING (true);

-- Policies for profiles: users can see profiles in their same group, or admin can see all
CREATE POLICY "Users can view profiles in their group" ON public.profiles FOR SELECT 
USING (
  group_id = (SELECT group_id FROM public.profiles WHERE id = auth.uid()) 
  OR 
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for matches: everyone can read, only admin can update
CREATE POLICY "Matches are viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Only admins can update matches" ON public.matches FOR UPDATE 
USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- Policies for predictions:
-- Users can insert/update their own predictions ONLY IF match has not started (30 mins before)
CREATE POLICY "Users can insert own predictions before lock" ON public.predictions FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND 
  (SELECT date_utc FROM public.matches WHERE id = match_id) > (now() + interval '30 minutes')
);

CREATE POLICY "Users can update own predictions before lock" ON public.predictions FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND 
  (SELECT date_utc FROM public.matches WHERE id = match_id) > (now() + interval '30 minutes')
);

-- Users can view their own predictions, or ANY prediction from users in their group IF the match is locked (within 30 mins or finished)
CREATE POLICY "Users can view predictions" ON public.predictions FOR SELECT
USING (
  auth.uid() = user_id -- Own predictions
  OR 
  (
    -- Other users predictions in same group, but ONLY if locked
    (SELECT group_id FROM public.profiles WHERE id = user_id) = (SELECT group_id FROM public.profiles WHERE id = auth.uid())
    AND
    (SELECT date_utc FROM public.matches WHERE id = match_id) <= (now() + interval '30 minutes')
  )
  OR
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);


-- 4. Triggers & Functions

-- Handle New User (SignUp)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  target_group_id UUID;
  is_first_user BOOLEAN;
BEGIN
  -- Get group_id from the code provided in user metadata
  SELECT id INTO target_group_id FROM public.groups WHERE code = new.raw_user_meta_data->>'group_code';
  
  -- Check if this is the first profile
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;

  INSERT INTO public.profiles (id, group_id, first_name, last_name, is_admin)
  VALUES (
    new.id,
    target_group_id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    is_first_user
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Calculate Points Function
CREATE OR REPLACE FUNCTION public.calculate_points_for_match(p_match_id UUID)
RETURNS void AS $$
DECLARE
  v_home_score INTEGER;
  v_away_score INTEGER;
  v_match_status TEXT;
  pred RECORD;
  v_points INTEGER;
  m_result TEXT;
  p_result TEXT;
BEGIN
  -- Get match details
  SELECT home_score, away_score, status INTO v_home_score, v_away_score, v_match_status
  FROM public.matches WHERE id = p_match_id;

  IF v_match_status != 'finished' OR v_home_score IS NULL OR v_away_score IS NULL THEN
    RETURN; -- Don't calculate if match not finished
  END IF;

  -- Determine actual match result
  IF v_home_score > v_away_score THEN m_result := 'home';
  ELSIF v_away_score > v_home_score THEN m_result := 'away';
  ELSE m_result := 'draw';
  END IF;

  -- Iterate through all predictions for this match
  FOR pred IN SELECT * FROM public.predictions WHERE match_id = p_match_id LOOP
    v_points := 0;

    -- Determine predicted match result
    IF pred.home_score > pred.away_score THEN p_result := 'home';
    ELSIF pred.away_score > pred.home_score THEN p_result := 'away';
    ELSE p_result := 'draw';
    END IF;

    -- Calculate Points
    IF p_result = m_result AND pred.home_score = v_home_score AND pred.away_score = v_away_score THEN
      v_points := 12;
    ELSIF p_result = m_result AND (pred.home_score = v_home_score OR pred.away_score = v_away_score) THEN
      v_points := 7;
    ELSIF p_result = m_result THEN
      v_points := 5;
    ELSIF pred.home_score = v_home_score OR pred.away_score = v_away_score THEN
      v_points := 2;
    ELSE
      v_points := 0;
    END IF;

    -- Update prediction points
    UPDATE public.predictions SET points_earned = v_points WHERE id = pred.id;
  END LOOP;

  -- Recalculate total points for users who predicted this match
  UPDATE public.profiles p
  SET total_points = (
    SELECT COALESCE(SUM(points_earned), 0)
    FROM public.predictions
    WHERE user_id = p.id
  )
  WHERE p.id IN (
    SELECT user_id FROM public.predictions WHERE match_id = p_match_id
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
