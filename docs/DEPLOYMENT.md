# Vercel release

30 September 2026.

- Game: https://gdr-botblitz.vercel.app/play
- TV leaderboard: https://gdr-botblitz.vercel.app/leaderboard
- Source: https://github.com/RaahimAlavi/GDR_BOTBLITZ (production branch `main`).
- Vercel project: `gdr-botblitz`, in `alaviraahim-9243s-projects`.

The Vite production build and SPA rewrites are configured in `vercel.json`. The repository is connected to Vercel for deployments on push. Public Supabase configuration and the canonical `VITE_PLAY_URL=https://gdr-botblitz.vercel.app/play` are set in Production and Preview. Environment files and local Vercel metadata are ignored by Git and deployment upload rules.

Open tabs can reference an older lazy-loaded bundle after a new release. Vite's `vite:preloadError` event now reloads the current URL to recover, and HTML routes use `Cache-Control: no-cache`. This follows [Vite's load-error guidance](https://vite.dev/guide/build.html#load-error-handling).

## QR behavior

The QR encodes a complete web URL pointing to `/play`. The public URL is also visible underneath the QR. Localhost does not offer a phone QR because loopback addresses refer to the scanning phone itself. Scan the hosted leaderboard with the phone camera and tap its Open Link action. Some scanner apps separately offer Copy Text; the website cannot force their navigation behavior.

An independent OpenCV QR decoder read the actual PNG from the published leaderboard and returned exactly `https://gdr-botblitz.vercel.app/play`. The saved QR is `docs/screenshots/live-qr.png` and the published board screenshot is `docs/screenshots/live-leaderboard.png`.

## Release checks

- All 18 regression tests, lint and the production build pass.
- Anonymous HTTP requests to `/play`, `/leaderboard` and `/gdr-logo.png` return 200; public visitors need no Vercel login.
- Published leaderboard loads the existing Supabase scores and reports Live Scores.
- Following the QR panel link opens the game lobby; the public game enters fullscreen with three hearts and supports Exit Fullscreen and Exit Run.
- Published browser warning/error logs are empty during inspection.
- No test score was saved to the live leaderboard. Physical phone camera scanning and device frame rate still need device verification.

## Updating

Push changes to the repository's `main` branch. This workspace's `master` branch tracks `origin/main`; use `git push origin HEAD:main` until the local branch is renamed. Alternatively, deploy the linked workspace with `npx vercel deploy --prod`.

After changing Vite environment variables in Vercel, create a new deployment so the client bundle receives them. Keep `VITE_PLAY_URL` pointed at the production URL used on the event TV.
