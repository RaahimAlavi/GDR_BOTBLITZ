# BOT BLITZ
A 60-second robot arcade challenge for the Gaming & Robotics Society.

## Play
- Enter a unique player name; random names are removed. Check a new name once, then tap Play. Returning names are remembered on that browser.
- The leaderboard shows each name's **best run** in the selected period. Repeat runs stay in history, and Runs Today counts every attempt.
- Start with **three hearts**. Each unshielded hazard hit costs one heart, removes 150 points, and resets your combo. A short grace period prevents repeated damage.
- The third hit ends the run immediately. Surviving the full 60 seconds also completes the run.
- Green batteries, blue cores, and rare gold cores give points. Chain pickups for up to 5×; mystery pickups grant temporary effects.
- **Drag anywhere** to steer relative to your finger's movement. Use WASD or arrow keys on a keyboard.
- Tap Play for a three-second ready cue. The app requests fullscreen and landscape when supported. The fullscreen button lets you leave or re-enter without ending the run.
- Landscape uses a compact sidebar; portrait remains playable. Rotation remaps the arena entities.
- The match clock continues during interruptions/backgrounding. Returning after the deadline finishes the run rather than extending it.

## Local development
```sh
npm install
npm run dev
npm test
npm run lint
npm run build
```

Routes: `/play` is the mobile game; `/leaderboard` is the responsive rankings page and TV kiosk. The phone layout includes a direct return to play. The TV view includes the QR code and fullscreen control.

## Vercel deployment
The GitHub repository is connected to the Vercel project `gdr-botblitz`. Pushes to `main` deploy production. Vercel uses the Vite preset, `npm run build`, and the `dist` output directory; SPA rewrites support direct visits to `/play` and `/leaderboard`.

Set the public Supabase URL and anon key in Vercel's Production and Preview environments. Keep environment files out of Git. The optional `VITE_PLAY_URL` should be the public production game's HTTPS URL, so the TV QR remains stable even when inspecting a preview deployment. Redeploy after changing build environment variables.

The QR encodes a complete web URL ending in `/play`, with no query or fragment. Pasted domains are normalized to HTTPS and invalid values fall back to the site's origin. Loopback addresses do not show a phone QR because another phone cannot reach this computer through `localhost` or `127.0.0.1`. Use the hosted `/leaderboard` for the event TV. A phone scanner may require tapping its Open Link action; websites cannot control the scanner's interface.

## Backend configuration
Copy `.env.example` to `.env` and supply:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
# Optional production QR destination:
VITE_PLAY_URL=https://your-domain.example/play
```

Use `supabase.sql` to set up the scores table, read/insert policies, indexes, and Realtime publication. The provided seed rows are optional. Before rerunning setup on an existing database, review its seed block.

For name reservations, apply `supabase-name-reservations.sql` once in the existing database. Until it is applied, name checks use run history and cannot prevent simultaneous first-time claims of an unused name. The migration adds a private registry and token-checked submissions without deleting runs. See [player name behavior and migration](docs/PLAYER_NAMES.md).

With no configured backend, demo mode stores scores in the same browser origin and updates other tabs through storage events. Demo scores on different phones are independent.

Each completed run is written to a durable, per-run device queue **before** the results screen or any network request. The results screen is included in the main bundle and displays “Saved on this device. Will sync automatically when connected.” Pending uploads survive closing the tab and reopening the site.

Uploads resume automatically on reconnection, opening the site, returning to a visible tab, and timed retries. Each upload has an eight-second timeout and abort signal, with exponential backoff up to about a minute. The lobby shows pending scores and provides a manual retry. Network failures keep the run queued; permanent server rejection keeps it on the device and requests attention instead of retrying continuously. Device-only scores are not announced as live kiosk scores. Fetch failures retain the last board instead of substituting demo scores.

Result processing shares one task across React effect replay. Each run uses the same UUID for its database primary key on every upload, so concurrent retries cannot create multiple rows for that run. Web Locks coordinate tabs when available; the database primary key also protects browsers without Web Locks. Retries first check for a previously saved session, including responses lost after a successful insert. Older local failures are migrated into the queue and older session strings receive deterministic UUIDs. Completion timestamps are preserved across delayed uploads. Synced receipts are retained for a week; pending runs have no expiry.

Automatic sync requires the site to be open, or reopened with a connection; it does not run while the browser is closed. Clearing site data removes local pending scores. A storage failure is reported rather than labelled as a successful save. This change preserves completed scores; it does not install an offline app or guarantee a first visit without internet.

## Competition integrity
Current run checks verify score consistency and completion by timer or three logged hits. Sessions use cryptographic UUIDs. Short life-loss runs can be saved without the old 53-second minimum or a 45-second client cooldown.

**The supplied backend still permits anonymous score inserts. Client checks are not authoritative anti-cheat.** A trusted submission endpoint, server-issued sessions, rate limits, and a database uniqueness policy are still needed before treating a public leaderboard as cheat-resistant. Do not put service-role credentials in Vite environment variables.

## Rendering and assets
- Canvas resolution capped at 2× DPR; static arena artwork cached.
- HUD meters update at about 12 Hz, with discrete score/life changes delivered immediately.
- Time-based particle emission and a particle budget; reduced-motion support.
- The lightweight results screen is included for use after a connection drop. Supabase, leaderboard, QR generation and confetti are loaded as needed.
- GDR logo: original `assets/GDRLOGO.jpg`; ImageGen transparent master `assets/GDR-logo-transparent-master.png`; 128-pixel delivery PNG `public/gdr-logo.png`.
- Procedural Web Audio sounds; no downloaded audio files.
- Vercel SPA rewrites are configured in `vercel.json`.

The audit is in `docs/PROJECT_AUDIT.md`. Implementation and verification notes are in `docs/IMPLEMENTATION.md`. Physical iOS/Android performance, fullscreen/orientation behavior, the deployed backend, and scanning on the event TV should be verified on those devices.
