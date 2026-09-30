# Automatic score recovery

Completed runs are persisted synchronously in a device outbox before network work, fullscreen cleanup, or rendering results. One local-storage key per run prevents two tabs overwriting different scores. Keys include the backend destination, so demo/test records cannot be uploaded to another configured project.

The results UI is included in the main bundle. It can show the score and its waiting status when a connection drops, without downloading the results screen. Supabase still loads separately, only when required. The lobby shows pending saves after reopening. The sync worker wakes on startup, online events, pageshow, visibility changes and scheduled retries. Actual request success determines whether a run is confirmed; a browser online flag alone is not considered confirmation.

Each attempt times out after eight seconds and aborts its requests. Temporary failures retain the run and back off with jitter from two seconds to roughly a minute. Server rejection retains the run, shows attention is required and supports manual retry. Pending runs are never aged out. Confirmed receipts can be pruned after a week. Storage failure is reported explicitly.

New UUID session IDs are also used as score-row primary keys. The existing database primary-key constraint protects retries and tab races without a schema migration. Older session formats receive deterministic IDs. A retry first checks for an existing saved session, including inserts committed before the response was lost. It handles a duplicate-key response by confirming the existing row. Web Locks additionally serialize tabs where supported. Original completion times are preserved so delayed uploads do not change the day of the run. Legacy device-only records are adopted into the queue and removed from the legacy store only after confirmation.

## Verification

- All 30 tests, lint and the production build pass. Queue tests exercise offline persistence, startup recovery, online/visibility triggers, timeouts/aborts, backoff, duplicate enqueue, two-tab storage isolation, storage failure, permanent rejection and manual retry, lost insert responses, primary-key races and deterministic legacy IDs.
- Browser verification used a separate local Vite app on port 5185 and a simulated Supabase REST server on 5186. No test scores were submitted to the live database.
- A run ended with the server returning 503. The results screen confirmed device storage and automatic retry. Closing the tab and reopening the app restored its pending notice. After the server recovered, the pending notice disappeared automatically and exactly one row was stored.
- A second run finished with the server unavailable. Restoring the server changed its results status to “Your score is on the leaderboard” and loaded the rank without pressing Retry. Exactly one row was stored for that run too.
- Screenshot evidence: `docs/screenshots/offline-result.png` and `docs/screenshots/reconnected-result.png`.

## Practical limits

Sync runs while the site is open and resumes on the next visit after it is closed. It does not run after the browser is closed. Clearing site data removes pending device records. A first offline visit or offline page reload is not guaranteed; this is durable score recovery, not a service-worker/PWA installation. Browser-owned fullscreen exit instructions remain normal browser UI.

Client-side consistency checks are still not authoritative anti-cheat. Stable retry IDs protect legitimate client retries; they do not stop a malicious client submitting invented runs under new IDs.
