# Player names and best scores

The database contains completed **runs**, not a player account per row. Raahim's 56,550 and 23,700 scores have different session IDs; they were two attempts. The old UI ranked raw attempts, so a name could occupy several places. Saved generated names were also reused on replays. We cannot determine whether historical identical names belonged to the same human or to different humans.

The leaderboard now shows one highest score per normalized name in the selected period. Capitalization and repeated spaces are ignored. Ties use the earlier run. Today uses today's best; All time uses the all-time best. All original runs remain in the database, and Runs Today still counts attempts. Rank and personal-best displays use the same player-name convention. Personal bests on a shared device are separated by name.

The random-name button and blank-name generation are removed. Remembered generated names are cleared from the input; historical generated scores remain in the leaderboard. A new player enters a name and taps Check Name. A taken name displays an error asking for initials or another name. A successful check enables Play; its separate tap preserves browser fullscreen permission. Returning names are remembered on that browser. A first name check requires internet; confirmed names can replay offline and use the existing durable score queue.

## One-time database migration

Apply `supabase-name-reservations.sql` in the existing project's Supabase SQL editor. **Do not rerun the original seed script.** The migration is transactional and repeatable, creates a private registry, and preserves all runs. A unique, case-normalized key lets only one device claim a new name even when requests overlap. Device tokens are random and stored before the claim request, so a lost response can retry with the same token. Only token hashes are stored on the server; public clients cannot read the registry. Reserved names submit scores through a token-checking function, keeping tokens out of public score rows. SDK and database calls remain outside the gameplay loop.

Historical names are reserved too. A returning device with a synced run receipt can adopt its old name. If that browser has lost its saved data or has no receipt, it must choose another name or contact the organizer. Historical session IDs were already public, so this compatibility bridge does not prove a historical player's identity. These are browser identities, not authenticated accounts; clearing site data or changing phones loses ownership. The original anonymous score-insert policy remains for existing clients and queued runs; this migration is not an anti-cheat system.

Until this migration is applied, the deployed app checks availability against existing scores and permits remembered names to replay. That prevents ordinary reuse of a recorded name, but **does not atomically reserve a fresh name before the first completed run**. Two first-time phones checking an unused name concurrently could still both pass. Missing RPC functions alone activate compatibility mode; network errors fail the name check instead of silently allowing play.

## Verification

`npm test` covers unique best scores, pagination when one person has many top runs, distinct-player rank, name validation, device tokens, retries after lost claim responses, offline replays, and storage errors. PGlite runs the actual migration and database functions against PostgreSQL locally, testing collision rejection, token secrecy, ownership checks, duplicate submissions, original timestamps and repeatable migration. PGlite is a development-only dependency and is not in the browser bundle.

Browser checks use an isolated PostgreSQL test server: blank names fail, `rAAhim` is rejected when historical `Raahim` is reserved, a fresh name can be claimed, Play enters fullscreen, and returning to the lobby preserves the confirmed name. The test leaderboard collapses five attempts to three names. No production scores are inserted by these tests.
