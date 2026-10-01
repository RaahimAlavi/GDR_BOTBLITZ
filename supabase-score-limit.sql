-- Run this in the EXISTING project's Supabase SQL editor.
-- No seed rows, score deletions, or name-registration changes.
-- Matches MAX_SCORE in src/lib/scoreLimits.js.
BEGIN;

DROP POLICY IF EXISTS "Allow anonymous score inserts" ON public.scores;
CREATE POLICY "Allow anonymous score inserts"
ON public.scores FOR INSERT
WITH CHECK (
  score >= 0 AND score <= 1000000 AND
  length(nickname) >= 1 AND length(nickname) <= 16
);

-- Update an older named-upload function if name reservations are installed.
-- CREATE OR REPLACE preserves its grants and existing name-ownership checks.
DO $migration$
DECLARE
  definition text;
BEGIN
  IF to_regprocedure('public.submit_named_score(text,jsonb)') IS NOT NULL THEN
    SELECT pg_get_functiondef(to_regprocedure('public.submit_named_score(text,jsonb)')) INTO definition;
    IF position('run_score NOT BETWEEN 0 AND 60000' IN definition) > 0 THEN
      EXECUTE replace(definition, 'run_score NOT BETWEEN 0 AND 60000', 'run_score NOT BETWEEN 0 AND 1000000');
    END IF;
  END IF;
END;
$migration$;

NOTIFY pgrst, 'reload schema';
COMMIT;
