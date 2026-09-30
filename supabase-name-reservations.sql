-- Apply once in the existing project's Supabase SQL editor.
-- Keeps all scores. Run rows are history; the UI shows each name's best run.
BEGIN;

CREATE TABLE IF NOT EXISTS public.botblitz_name_claims (
  name_key text PRIMARY KEY,
  nickname varchar(16) NOT NULL,
  token_hash bytea,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.botblitz_name_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.botblitz_name_claims FROM PUBLIC, anon, authenticated;

-- Historical names remain reserved. A returning device can adopt one using
-- a synced run receipt. Existing public run IDs are not login credentials;
-- this compatibility bridge does not authenticate historical human identity.
INSERT INTO public.botblitz_name_claims(name_key, nickname)
SELECT DISTINCT ON (lower(regexp_replace(trim(nickname), '\s+', ' ', 'g')))
  lower(regexp_replace(trim(nickname), '\s+', ' ', 'g')), trim(nickname)
FROM public.scores
ORDER BY lower(regexp_replace(trim(nickname), '\s+', ' ', 'g')), score DESC, created_at ASC
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_player_name(p_nickname text, p_token text, p_legacy_session_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  clean text := regexp_replace(trim(p_nickname), '\s+', ' ', 'g');
  key text := lower(clean);
  hash bytea := pg_catalog.sha256(pg_catalog.convert_to(p_token, 'UTF8'));
  chosen public.botblitz_name_claims%ROWTYPE;
BEGIN
  IF clean IS NULL OR length(clean) NOT BETWEEN 1 AND 16 OR clean !~ '^[A-Za-z0-9_ -]+$'
    OR p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid name or device token' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.botblitz_name_claims(name_key,nickname,token_hash)
    VALUES(key,clean,hash) ON CONFLICT DO NOTHING;
  SELECT * INTO chosen FROM public.botblitz_name_claims WHERE name_key = key FOR UPDATE;
  IF chosen.token_hash IS NULL AND p_legacy_session_id IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.scores WHERE session_id = p_legacy_session_id
      AND lower(regexp_replace(trim(nickname), '\s+', ' ', 'g')) = key
  ) THEN
    UPDATE public.botblitz_name_claims SET token_hash = hash WHERE name_key = key;
    chosen.token_hash := hash;
  END IF;
  RETURN jsonb_build_object('available', coalesce(chosen.token_hash = hash,false), 'nickname',chosen.nickname);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_named_score(p_token text, p_run jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  chosen public.botblitz_name_claims%ROWTYPE;
  saved public.scores%ROWTYPE;
  run_id uuid := (p_run->>'id')::uuid;
  run_session text := p_run->>'session_id';
  run_score integer := (p_run->>'score')::integer;
  run_duration integer := (p_run->>'game_duration')::integer;
  completed timestamptz := (p_run->>'created_at')::timestamptz;
BEGIN
  SELECT * INTO chosen FROM public.botblitz_name_claims
    WHERE name_key = lower(regexp_replace(trim(p_run->>'nickname'), '\s+', ' ', 'g'));
  IF chosen.token_hash IS NULL OR p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$'
    OR chosen.token_hash <> pg_catalog.sha256(pg_catalog.convert_to(p_token,'UTF8')) THEN
    RAISE EXCEPTION 'This name belongs to another player' USING ERRCODE = '42501';
  END IF;
  IF run_session IS NULL OR run_session <> run_id::text OR run_score IS NULL OR run_score NOT BETWEEN 0 AND 60000
    OR run_duration IS NULL OR run_duration NOT BETWEEN 0 AND 60 OR completed IS NULL THEN
    RAISE EXCEPTION 'Invalid run' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.scores(id,nickname,score,session_id,game_duration,created_at)
    VALUES(run_id,chosen.nickname,run_score,run_session,run_duration,completed)
    ON CONFLICT(id) DO NOTHING;
  SELECT * INTO saved FROM public.scores WHERE id = run_id;
  IF saved.session_id <> run_session OR lower(saved.nickname) <> chosen.name_key THEN
    RAISE EXCEPTION 'Run belongs to another player' USING ERRCODE = '42501';
  END IF;
  RETURN to_jsonb(saved);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_player_name(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_named_score(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_player_name(text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_named_score(text,jsonb) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
