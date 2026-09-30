# BOT BLITZ implementation
Date: 30 September 2026. Implements the requested UI, fullscreen, landscape and three-heart pass after the project audit.

## Experience
The lobby, results and leaderboard now share a navy/cyan/lime arcade identity, readable type, quieter panels, and the GDR logo. A friendly robot appears in the lobby and Canvas game. Play is the primary action; instructions expand when needed. Names are optional, remembered and never auto-focus the phone keyboard.

Play requests fullscreen from the user's tap, then attempts landscape orientation lock. Unsupported/declined requests leave the game playable in the viewport. The in-game control toggles fullscreen without abandoning the run. Completion and Exit release game-owned fullscreen and orientation lock. Portrait remains supported; short landscape screens use a left HUD sidebar to preserve arena space.

Each run starts with three hearts and a three-second ready cue. Each unshielded hit removes one heart and 150 points, resets the combo, and gives a 1.6-second grace period. Shields absorb one hit. The third hit finishes immediately; survival still ends at 60 seconds. Both completion paths save a valid score. Rematch resets all hearts.

Relative dragging can start anywhere without moving the robot under the finger. Pointer capture, cancellation, multitouch filtering, keyboard input and blur cleanup are included. Rotation remaps arena entities and targets. The match deadline is based on elapsed time, so backgrounding cannot extend a run.

## Rendering and delivery
Static arena layers are cached. Canvas DPR is capped at 2, particles are capped and emitted by elapsed time, reduced-motion settings suppress extra effects, and HUD meters update around 12 Hz with immediate discrete changes. Results and leaderboard code load separately; Supabase, QR and confetti are absent from the initial main chunk.

Production main JS: about 99.2 KB gzip versus the audit's 172.8 KB eager JS, approximately 43% smaller initial JavaScript. Total downloaded code still includes additional chunks when those features are used. This is a build-size comparison, not measured phone FPS or a Core Web Vitals result.

## Result reliability
Removed the missing results setter and effect-replay rejection. Pure session validation and shared result tasks prevent development Strict Mode from double-saving a run. Local notifications fire once, storage events update other tabs, and rank counts scores beyond the previous 100-row cap.

Configured cloud failures are labelled device-only and support retry; failed live reads retain the last board instead of showing seeded demo data. Successful saves can still show a temporarily unavailable rank. Submission retries look up an existing session, but atomic database uniqueness remains future work.

## Logo asset
Built-in ImageGen **edit / background-extraction** mode was used on `assets/GDRLOGO.jpg`, followed by one cleanup edit. The original is preserved.

- Transparent master: `assets/GDR-logo-transparent-master.png`.
- Delivery asset: `public/gdr-logo.png`, 128 × 128, 12,986 bytes with real alpha transparency.
- Cleanup specification: remove residual cyan speckles outside the logo; preserve the existing globe, controller, hands and surrounding swoosh geometry; keep flat cyan strokes, transparent interior holes and a transparent background; add no glow, shadows, text or redesigned details.
- Initial extraction prompt: “Use case: background-extraction. Edit target: the provided Gaming and Robotics society cyan logo. Remove only the pale background and large empty margins. Preserve the exact cyan logo geometry, strokes, globe, controller, hands and curved surrounding swoosh, unchanged. The holes inside the logo must be transparent too. Center the complete logo, tightly framed with about 5 percent clear margin. Output a flat clean transparent PNG cutout with smooth edges and actual alpha transparency; no backdrop, glow, shadows, added text, embellishment or redesigned details. This is a small UI brand asset to display on dark navy backgrounds.”

## Verification
`npm test`, `npm run lint` and `npm run build` pass. Fourteen regression tests exercise actual source modules with browser/canvas/audio stubs: heart loss, shields, deadline timing, rotation, relative controls, HUD throttling, pickup/combo/double/overload score consistency, invalid completion, repeat-safe results, rank beyond 100, cross-tab notifications and fullscreen cleanup/failure races.

Browser verification used a separate demo-only dev server on port 5174, with Supabase disabled by process environment overrides. No test score was submitted to the live database and the project's environment files were unchanged.

Inspected layouts at 320 × 700, 390 × 844, 667 × 375, 844 × 390 and 1920 × 1080. The compact landscape lobby fits without scrolling; the kiosk shows ten rows in 1080p; phone navigation remains accessible. Browser rounds confirmed third-hit and timer completion, demo saves, fresh hearts on replay, fullscreen entry/exit and rotation during play. Browser warning/error logs were empty at the final inspection.

Screenshots are under `docs/screenshots/`.

## Remaining checks
Physical iOS/Android smoothness, browser-specific fullscreen/orientation behavior, event-TV QR scanning and deployed Supabase behavior need device/service testing. The supplied SQL still permits anonymous inserts; trusted server score verification, rate limits, atomic session uniqueness, consistent event-day boundaries and server aggregation beyond Supabase row limits remain backend work. These are not claimed as solved by this UI pass.
