# BOT BLITZ project audit

Date: 30 September 2026. Scope: analysis before implementation.

The existing React/Vite application is a workable foundation for a quick, competitive phone game. Keep the Canvas engine, the 60-second format, the combo system, procedural sound, and the separate TV leaderboard. The most valuable next work is reliable results, mobile control/layout fixes, less rendering work, and a consistent visual identity.

No application code, database schema, dependencies, or original images were changed during this audit. Browser gameplay used a separate local demo server with Supabase disabled through process environment overrides; no test scores were sent to the live database.

## Coverage and verification

Reviewed all application components, both routes, all five library modules, CSS/Tailwind, Vite/deployment configuration, database setup, README, package scripts, and available image assets.

| Check | Result |
| --- | --- |
| Production build | Passed |
| Existing lint command | Passed with one warning in `Leaderboard.jsx:51`; missed the undefined results-screen setter |
| Browser walkthrough | Start screen, active game, complete round, results, and leaderboard in the in-app Chromium browser |
| Responsive inspection | 390 × 844 phone-sized viewport and 1920 × 1080 TV-sized viewport; these are desktop browser viewport checks, not physical-device tests |
| Results runtime | Reproduced `ReferenceError: setIsSubmitting is not defined`, duplicate-session rejection, and a missing rank |
| Engine logic probes | 600 HUD callbacks in 10 simulated seconds at 60 Hz; a 10-second frame gap advances game time only 0.1 seconds; a resize can strand pickups outside the arena |
| Local score-service probes | One submission sends two same-window notifications; a cross-tab `storage` event sends none; a score below 150 higher scores incorrectly receives rank 101 |
| Real phone frame rate / CPU trace | Not measured. Chrome DevTools tracing tools are unavailable in this session. No FPS, battery, or Core Web Vitals claim is made |
| Live backend | Supplied SQL and client integration reviewed; deployed schema, RLS, Realtime configuration, and cloud outage behavior were not tested against the live service |

Logic probes loaded the source into Node with browser/audio/network dependencies stubbed. They demonstrate behavior, not rendering speed.

## Fix first: correctness and reliability

1. **Results handling throws and is not repeat-safe.** `GameOverScreen.jsx:32`, `:51`, and `:61` call `setIsSubmitting`, which is never declared. In development, Strict Mode repeats effect setup, while validation permanently consumes a session before the asynchronous save finishes. The second setup flags the valid run as already submitted, and the first setup's completion is ignored after cleanup. The browser reproduced a 13,450-point local score appearing on the board while the results screen remained flagged with no rank. Make result processing idempotent and model validation, saving, success, local-only, and failure explicitly. The missing setter also affects production paths independently of Strict Mode.

2. **Cloud failure is presented as success.** `supabase.js:174` falls back to local storage on any insert error and returns `success: true`. The phone and TV do not share local storage. A player can therefore believe their score reached the booth when it did not. Fetch failures can also replace the live board with seeded demo data. Separate deliberate demo mode from a live service outage; preserve the last confirmed board, show connection state, and support safe retry without duplicate submissions. Local storage failure is currently swallowed too.

3. **The supplied SQL does not enforce the advertised anti-cheat.** `supabase.sql:35` allows anonymous direct inserts with only score and nickname-length bounds. It does not verify duration, event history, rate limits, or session authenticity, and `session_id` is not unique. The client holds replay/rate-limit state only in memory and generates IDs with `Math.random()`. The README's server verification and cryptographic-session claims are inaccurate for this implementation. For an event competition, move submission checks behind a trusted endpoint, issue server sessions, enforce idempotency/limits, and define the level of gameplay validation required. A server endpoint alone is not proof that client-reported play was legitimate. Align the current client 55,000 and SQL 60,000 ceilings with an established scoring policy.

4. **Ranks become wrong after 100 higher scores.** `calculatePlayerRank` fetches only 100 rows (`supabase.js:217`). Count all qualifying higher scores on the server, with an explicit tie policy and matching ordering in both result and leaderboard views.

5. **Local Realtime does not work across tabs as described.** `notifyLocalRealtime` invokes its callback set and dispatches a same-window custom event; subscribers listen to both, so one insert is delivered twice. The custom event does not cross tabs, and no native `storage` or BroadcastChannel listener is installed. Use one delivery path per window and a real cross-tab transport.

6. **Phone interruptions change match duration unexpectedly.** `gameEngine.js:213` clamps frame delta to 100 ms and uses that same value for the match clock. A long frame gap or backgrounded tab extends a supposed 60-second run. There is an `isPaused` field but no visibility lifecycle. Define the ranked policy explicitly: wall-clock deadline, or an intentionally paused run with consistent validation. Separate simulation stepping from elapsed match time.

7. **Orientation changes leave entities off-screen.** `resize()` adjusts the canvas dimensions without remapping collectibles, hazards, or targets. A pickup at y=750 remains there after the arena height shrinks to 390. Reproject/clamp entities or keep a consistent logical arena with a defined orientation policy.

## Mobile performance

The build emits approximately **585 kB JavaScript, 173 kB gzipped**, plus **28.5 kB CSS, 6.2 kB gzipped**. These are Vite build sizes, not measured network transfers. External font files are additional.

| Finding | Why it matters | Proposed change |
| --- | --- | --- |
| `gameEngine.js:316` emits a fresh HUD object every simulation frame; `GameCanvas` sets React state on every callback | Repeated component work occurs even when score and displayed seconds are unchanged; it scales with refresh rate | Publish discrete changes immediately and throttle smooth meter updates, initially around 10–15 Hz; measure responsiveness |
| Both routes are imported eagerly in `App.jsx`; the build preloads Supabase and vendor chunks | Phone entry loads TV-only QR/confetti code and result/network code before it is needed | Lazy-load the TV route and deferred result/services; verify the resulting network dependency tree |
| Canvas DPR cap is 2.5 | A 390 × 844 arena becomes about 2.06 million pixels, 6.25 times its CSS area | Add a measured quality policy; compare a 1.5–2 DPR cap on target phones while retaining crisp UI text |
| Glowing collectibles, hazards, and floating text repeatedly set `shadowBlur`; grid is redrawn every frame | Potential raster cost increases during the busiest stage | Cache static arena/sprite artwork where beneficial, reduce overlapping glows, and profile overload mode |
| HUD uses multiple backdrop blurs and continuous bouncing/pulsing | Effects compete visually and may add composition cost | Use mostly opaque HUD surfaces and short animations triggered by events |
| Thruster emission is probabilistic per frame | Faster-refresh screens emit more particles per second | Emit by elapsed time; apply an explicit particle budget |
| Three Google font families are requested in `index.html` | Adds external stylesheet/font dependencies | Consolidate typography and load only required weights; assess self-hosted subsets |
| Small temporary allocations in array counts and frame callback binding | Secondary cleanup opportunity, not a demonstrated bottleneck | Bind the loop once and use simple counts if profiling warrants it; prioritize raster/HUD work first |

Canvas caching and avoiding excessive `shadowBlur` are consistent with [MDN's canvas optimization guidance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas). Actual savings must be measured on the game.

## Controls, fairness, and fun

- **Finger visibility:** steering currently moves toward the exact finger location (`setInputTarget`). Trial relative dragging or a small visible offset so the thumb does not hide the robot and incoming hazards. Preserve quick direction changes and a predictable collision point.
- **A protected play area:** pickups can spawn at y=40, inside the overlaid HUD. Reserve top UI/safe-area space and ensure spawning and movement use the same arena bounds.
- **Fairness across screens:** speed, radii, magnet range, barrier length, and combo timing are in CSS pixels while arena size follows the viewport. A small phone and a wide desktop therefore offer different travel distances and hazard coverage. Choose a common logical arena or deliberately normalize difficulty before treating scores as comparable.
- **First-run clarity:** play starts immediately after nickname submission. Add a short ready cue and a visual drag demonstration; keep repeat play fast.
- **Reward readability:** retain rising collection pitches and combos, but make the next multiplier and streak expiry clearer. Add short pickup scale/burst feedback without moving the HUD continuously.
- **Hazard fairness:** lasers already have a useful warning phase. Improve warning contrast and keep new mines/drones/barriers away from immediate unavoidable collisions. `getSafeRandomPos` is only a padding helper; it does not guarantee separation from hazards or UI.
- **Difficulty balance:** mines can start around 1.5 seconds because their timer begins at 3 seconds against a 4.5-second threshold. Test that against the intended beginner warmup. Random reversed controls can feel arbitrary; make the risk recognizable and tune after playtesting.
- **Results worth replaying:** show best combo, collected items, hits, personal-best difference, and distance to the next rank. Most raw collection/hit information is already logged; best combo and result metadata can be captured explicitly.
- **One-tap rematch:** retain the existing rematch convenience and add a clear route to change the callsign. Avoid making players wait for an unreliable network request to play again, while preserving pending submissions safely.

These are design hypotheses to validate through playtesting, not claims that adding more mechanics will automatically improve the game.

## UI, branding, and accessibility

**Recommended direction:** a compact arcade control panel with a dark navy base, the logo's cyan as the primary accent, green for pickups, amber for achievements, and red for danger. Use a distinctive robot illustration/shape consistently between the start screen and gameplay. The current friendly robot face becomes an arrow-shaped ship in play.

| Surface | Recommended treatment |
| --- | --- |
| Start | GDR branding, clear game title, quick visual rules, saved callsign, personal best, prominent Play button; avoid opening the keyboard automatically |
| In-game HUD | Stable positions, large score/timer, compact combo meter, quiet power-up indicator, safe-area padding; preserve unobstructed play space |
| Results | Score first, short celebratory feedback, meaningful run stats, accurate saved/pending state, dominant Play Again button |
| Phone leaderboard | Compact rankings, visible Back/Play action, personal standing; remove emphasis on TV controls and a QR code for the phone already in use |
| TV leaderboard | Fit all ten entries at 1080p, enlarge distant-viewing essentials, give the QR code adequate contrast/margin, and distinguish offline/reconnecting from live |

The phone leaderboard currently hides its Play link with `hidden sm:flex`. On the 1920 × 1080 preview, the tenth row extends below the visible frame and the footer bottom is around y=1199. Both surfaces need dedicated layout treatment.

At the phone viewport, the sound button is 38 × 38 CSS pixels, the random-name button 36 × 36, and the rank link 30 pixels tall. Increase the comfortable hit area toward 44–48 pixels, enlarge tiny instructional text, add clear keyboard focus/error announcements, and allow page zoom outside the play interaction. Provide reduced-motion treatment for shake, flashing, bounce, and confetti. There are currently no safe-area inset rules or reduced-motion rules. Add keyboard steering for desktop accessibility.

**Logo:** `assets/GDRLOGO.jpg` is a 1000 × 1000 cyan mark on a pale opaque background, approximately 39.5 kB, with large margins. It is not imported by the app. Preserve the source and prepare a tightly cropped transparent PNG/WebP during the design phase; inspect edges on dark backgrounds and retain the exact mark. No background removal was performed in this analysis phase.

`src/assets/hero.png`, the React/Vite starter SVGs, and `App.css` are not referenced by the application. They are cleanup candidates, not identified initial-load payload problems.

The requested [21st.dev component collection](https://21st.dev/community/components) was inspected. Use its button, card, tab, and progress treatments as references for menus/results. Evaluate dependencies and rendering cost before adopting any component; game feedback should stay tightly integrated with the Canvas engine.

## Kiosk and maintainability follow-up

- Use server-side aggregates for kiosk totals. `fetchKioskStats` fetches all selected rows and counts nicknames in the browser; backend row limits can truncate totals. A nickname is also not a stable player identity.
- Choose a shared event timezone. “Today” currently follows each browser's local midnight, and an idle TV has no scheduled midnight refresh.
- Track actual subscription health; the current “REALTIME SYNC” badge only means credentials are configured. Coalesce burst updates and recover cleanly from reconnects.
- Stabilize the high-score overlay's `onClose` callback. The inline callback changes during parent updates, rerunning the effect that plays sound/confetti and starts dismissal. Clean up highlight timers and define how simultaneous announcements are queued.
- Keep alert labels consistent with Today versus All Time, and define tie handling explicitly.
- Review QR scanning on the actual TV: the configured margin is 1.5 modules, and cyan replaces a white light region. Use a generous quiet zone and verify under booth lighting.
- Handle unavailable/malformed local storage without breaking startup or results; several reads/writes are unguarded.
- Split the 1,378-line engine into focused rules/input/simulation/rendering pieces only as needed for the fixes. Avoid a framework rewrite.
- Add focused regression coverage for session completion, retry/idempotency, ranking, interrupted timing, and resize. There is no test script today. Enable lint detection for undefined identifiers so the current results error cannot silently pass again.
- Update the README to describe implemented guarantees, demo scope, and event operating procedure accurately. The current optional SQL seed is not idempotent by session ID.

React documents the development-only effect replay that exposes the results issue in its [Strict Mode reference](https://react.dev/reference/react/StrictMode).

## Suggested implementation sequence

1. **Make runs trustworthy:** fix results processing, explicit save states, retry/idempotency, ranks, local notifications, and the ranked-submission boundary.
2. **Make phone play dependable:** separate timing from simulation, handle visibility/resize, define fair arena bounds, keep controls visible, and reduce HUD/render work.
3. **Build the visual system:** prepare the transparent GDR asset, consolidate typography/colors, redesign start/HUD/results, and provide separate phone/TV leaderboard layouts.
4. **Tune the game feel:** ready cue, collection feedback, combo clarity, hazard warnings, progression, and useful post-run goals. Playtest before increasing mechanic count.
5. **Validate for the event:** physical iOS Safari and Android Chrome, small/large phones, high-refresh devices, weak/offline network, interruptions, rapid rematches, concurrent submissions, and the actual 1080p TV/QR setup.

Proposed targets, to verify rather than assume: stable 60 FPS on representative phones, no sustained overload-stage slowdown, correct 60-second policy across interruptions, truthful save states, full top ten visible on the TV, and a clear path from scan to play to rematch.
