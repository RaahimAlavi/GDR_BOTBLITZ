# First-run score saving

The reported missing first run under `alize` was above 60,000 points. The previous client rejected any score over 60,000 before writing the device queue, even when its points matched the game's collection log. The supplied database insert policy and named-upload function also had that limit. This was a score ceiling problem, rather than a requirement to play twice. A clean first run below the ceiling saved normally in browser testing.

The app now uses a shared 1,000,000-point ceiling, preserving integer, non-negative, log-consistency and run-completion checks. Name confirmation starts the upload worker before the first match. Results explicitly enqueue every run after its durable local save, and the worker listens for same-window queue changes. None of these paths depends on a replay or a second game. Existing retry IDs and completion timestamps remain unchanged.

Apply **`supabase-score-limit.sql`** to the existing project's SQL editor to update its insert policy. It preserves score history and creates no seed data. If an older name-reservation upload function exists, the migration updates its score bound while preserving its name-ownership checks and grants. A missing name-reservation function is fine; installing name reservations is a separate task. Fresh setup files use the new ceiling too.

If the server still has the old limit, new high scores stay in the durable queue with a message that the leaderboard limit needs updating. They retry automatically after the policy is corrected. Existing low scores and offline/reconnection behavior remain supported. A previous over-limit run rejected before the old queue write cannot be reconstructed from the database; do not invent a replacement score.

Verification includes a 90,000-point collection-log run, first-run upload startup, queue changes during another upload, a high score waiting for the old server policy then syncing, actual PostgreSQL anonymous-policy migration, existing named-function migration, repeatable migration, ownership rejection, upper-bound rejection, and preservation of existing history. Browser tests use an isolated backend; no production test scores are inserted.
