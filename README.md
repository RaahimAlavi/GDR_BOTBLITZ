# BOT BLITZ
A 60-second robot arcade challenge for the Gaming & Robotics Society.

## Play
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

## Backend configuration
Copy `.env.example` to `.env` and supply:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
# Optional production QR destination:
VITE_PLAY_URL=https://your-domain.example/play
```

Use `supabase.sql` to set up the scores table, read/insert policies, indexes, and Realtime publication. The provided seed rows are optional. Before rerunning setup on an existing database, review its seed block.

With no configured backend, demo mode stores scores in the same browser origin and updates other tabs through storage events. Demo scores on different phones are independent.

Configured cloud failures retain scores locally and identify them as **device-only**, with a Retry action on the results screen. Local-only scores are not announced as live kiosk scores. Fetch failures retain the last board instead of substituting demo scores.

Result processing shares one task across React effect replay. Save attempts in one browser are deduplicated by session. Cloud retry checks for a previously saved session before inserting. This is client-side protection against accidental duplicates, not an atomic database guarantee.

## Competition integrity
Current run checks verify score consistency and completion by timer or three logged hits. Sessions use cryptographic UUIDs. Short life-loss runs can be saved without the old 53-second minimum or a 45-second client cooldown.

**The supplied backend still permits anonymous score inserts. Client checks are not authoritative anti-cheat.** A trusted submission endpoint, server-issued sessions, rate limits, and a database uniqueness policy are still needed before treating a public leaderboard as cheat-resistant. Do not put service-role credentials in Vite environment variables.

## Rendering and assets
- Canvas resolution capped at 2× DPR; static arena artwork cached.
- HUD meters update at about 12 Hz, with discrete score/life changes delivered immediately.
- Time-based particle emission and a particle budget; reduced-motion support.
- Leaderboard, results, Supabase, QR generation, and confetti are loaded as needed.
- GDR logo: original `assets/GDRLOGO.jpg`; ImageGen transparent master `assets/GDR-logo-transparent-master.png`; 128-pixel delivery PNG `public/gdr-logo.png`.
- Procedural Web Audio sounds; no downloaded audio files.
- Vercel SPA rewrites are configured in `vercel.json`.

The audit is in `docs/PROJECT_AUDIT.md`. Implementation and verification notes are in `docs/IMPLEMENTATION.md`. Physical iOS/Android performance, fullscreen/orientation behavior, the deployed backend, and scanning on the event TV should be verified on those devices.
