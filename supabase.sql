-- ========================================================
-- BOT BLITZ: Supabase Database Setup & Realtime Configuration
-- Gaming & Robotics Society Freshers Week Kiosk
-- ========================================================

-- Ensure session is in read-write mode
SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE;

-- 1. Create scores table
CREATE TABLE IF NOT EXISTS public.scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname VARCHAR(16) NOT NULL,
    score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    session_id TEXT NOT NULL,
    game_duration INTEGER DEFAULT 60
);

-- 2. Optimize Indexes for Leaderboard Performance
CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON public.scores (score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_created_at_desc ON public.scores (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_today_ranking ON public.scores (created_at DESC, score DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS Policies (Allows public kiosk play without login)
DROP POLICY IF EXISTS "Allow anonymous read access" ON public.scores;
CREATE POLICY "Allow anonymous read access"
ON public.scores
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow anonymous score inserts" ON public.scores;
CREATE POLICY "Allow anonymous score inserts"
ON public.scores
FOR INSERT
WITH CHECK (
    score >= 0 AND 
    score <= 60000 AND 
    length(nickname) >= 1 AND 
    length(nickname) <= 16
);

-- 5. Enable Realtime Replication for the scores table
-- In Supabase, the publication 'supabase_realtime' is already created by default.
-- We safely add the 'scores' table to it if it isn't already added.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'scores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;
  END IF;
END $$;

-- 6. Seed Sample Kiosk Scores (Optional)
INSERT INTO public.scores (nickname, score, session_id, game_duration, created_at)
VALUES
    ('ZAIN_BOT', 18420, 'seed_session_01', 60, now() - INTERVAL '2 hours'),
    ('SARA_99', 17850, 'seed_session_02', 60, now() - INTERVAL '3 hours'),
    ('AHMED_ROBO', 16900, 'seed_session_03', 60, now() - INTERVAL '4 hours'),
    ('HAMZA_X', 15770, 'seed_session_04', 60, now() - INTERVAL '5 hours'),
    ('CYBER_VIPER', 14320, 'seed_session_05', 60, now() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;
