# 🤖 BOT BLITZ

> **Fast-paced 60-second arcade robot survival kiosk game** built for the **University Gaming & Robotics Society Freshers Week**.

Students scan a QR code on a large TV kiosk screen, instantly launch the game on their mobile phones with no registration or login required, survive 60 seconds, and watch their scores update in **realtime** on the kiosk leaderboard mounted at the society booth.

---

## ⚡ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/) (`/play` and `/leaderboard`)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with Cyberpunk & Neon Kiosk Theme
- **Game Engine**: Custom HTML5 Canvas 60 FPS physics engine with touch & mouse tracking
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL + Supabase Realtime)
- **Audio Engine**: Web Audio API procedural sound synthesizer (zero audio asset latency)
- **Kiosk TV QR Code**: Native SVG/Canvas QR Generator (`qrcode`)
- **Celebration FX**: `canvas-confetti` for Champion takeovers

---

## 🕹️ Game Features

1. **60-Second Challenge**:
   - Exactly 60.0 seconds per match.
   - Smooth mobile touch-and-drag controls (also mouse playable on desktop).
   - High-DPI canvas scaling, touch rubber-band prevention, and gesture locking.

2. **Collectibles**:
   - 🔋 **Green Battery**: `+100` points
   - ⚡ **Blue Energy Core**: `+300` points
   - 🌟 **Rare Golden Core**: `+750` points (with golden sparkle trails)

3. **Dynamic Hazards**:
   - 🔴 **Red Laser Beams**: 1.2s dashed warning telegraph line followed by a blazing lethal laser.
   - 🛸 **Enemy Drones**: Robotic sentinel drones patrolling and bouncing off arena boundaries.
   - ⚡ **Moving Electric Barriers**: High-voltage oscillating electric fences.
   - 💣 **Proximity Mines**: Spiked floating energy mines.

4. **Damage & Combo System**:
   - Hazard collision does **not** terminate the game!
   - Collision briefly stuns the robot (0.75s), triggers a red screen flash and camera shake, deducts points (`-150`), and resets combo multiplier to `x1`.
   - Temporary invulnerability shield (1.6s) with flashing visuals to prevent multi-hit unfairness.
   - Fast pickups increment multiplier: **x1 → x2 → x3 → x4 → x5**.
   - Multiplier decays if no item is collected within 2.8 seconds.

5. **Mystery Power-Ups**:
   - 🛡️ **Shield**: Absorbs 1 hazard hit with zero score or combo loss.
   - 🧲 **Magnet**: Attracts nearby energy items toward the robot within 220px radius.
   - ⚡ **Double Points (2X)**: Doubles all points for 8 seconds.
   - ⏱️ **Time Slow**: Hazards move at 45% speed for 6 seconds.
   - 🚀 **Speed Boost**: Robot receives enhanced speed and agility for 7 seconds.
   - ⚠️ **System Malfunction**: Rare negative glitch (~6% chance) reversing controls for 3 seconds.

6. **60-Second Difficulty Progression**:
   - `0-10s`: Easy starter warmup; mostly batteries.
   - `10-20s`: Red laser warning lines and sweeps begin.
   - `20-30s`: Enemy drones deploy.
   - `30-40s`: Moving electric barriers activate.
   - `40-50s`: Hazards move faster and spawn more frequently.
   - `50-60s`: **SYSTEM OVERLOAD MODE** (Pulsing red arena grid, +50% item point boost, intense arcade pacing).
   - `10s to 0s`: Dramatic audio-visual countdown (10.. 9.. 8.. 1).

7. **Anti-Cheat Validation**:
   - Unique cryptographic session tokens generated on game start.
   - Server/session event log tracking item collections, damage, timestamps, and mathematical point limits.
   - Reject sessions finishing significantly faster than 60 seconds (< 53s).
   - Replay prevention and device rate limiting.
   - Profanity and script/HTML injection filtering for nicknames (max 16 characters).

8. **Kiosk TV Leaderboard**:
   - Dedicated `/leaderboard` route styled for 1080p/4K TVs.
   - Supabase Realtime auto-update (no page refreshes).
   - Top 10 rankings with 🥇 Gold, 🥈 Silver, 🥉 Bronze highlights.
   - Kiosk stats: **Total Players Today**, **Games Played Today**, **Highest Score Today**.
   - Modes: **TODAY** (default, resets daily based on timestamp) & **ALL TIME**.
   - **New High Score TV Animation**:
     - Top 10 Entry: Animated neon TV overlay with player name and rank.
     - New #1 Champion: Confetti shower, gold crown, victory fanfare!
   - Built-in dynamic QR code pointing straight to `/play`.
   - Fullscreen button (`F11` or on-screen button).

---

## 📁 Project Structure

```
BOTBLITZ/
├── public/
│   └── favicon.svg              # Futuristic robot favicon
├── src/
│   ├── components/
│   │   ├── GameCanvas.jsx       # Canvas component with touch/mouse event listeners
│   │   ├── GameHUD.jsx          # Score, timer, combo meter, active power-up HUD
│   │   ├── GameOverScreen.jsx   # Match result card, rank calculation, rematch button
│   │   ├── HighScoreAlert.jsx   # Top 10 & #1 Champion TV takeover overlay
│   │   ├── Leaderboard.jsx      # TV Kiosk leaderboard with stats & dual-column view
│   │   ├── LeaderboardRow.jsx   # Top 10 ranked item with medals (🥇🥈🥉)
│   │   ├── PowerUpIndicator.jsx # Active power-up countdown banner
│   │   ├── QRCodePanel.jsx      # QR code card for kiosk TV scans
│   │   ├── SoundToggle.jsx      # Sound FX mute/unmute control
│   │   └── StartScreen.jsx      # Nickname callsign input & quick rules preview
│   ├── lib/
│   │   ├── gameEngine.js        # 60 FPS HTML5 Canvas game loop, physics, hazards
│   │   ├── profanityFilter.js   # Name sanitization, regex filters, random name generator
│   │   ├── scoreValidation.js   # Anti-cheat verification and session validation
│   │   ├── soundFx.js           # Procedural Web Audio API sound synthesizer
│   │   └── supabase.js          # Supabase client, realtime listener & offline fallback
│   ├── pages/
│   │   ├── LeaderboardPage.jsx  # /leaderboard route
│   │   └── PlayPage.jsx         # /play route
│   ├── App.jsx                  # React Router configuration
│   ├── index.css                # Tailwind CSS + Cyberpunk custom glow utilities
│   └── main.jsx                 # React root mounting
├── .env.example                 # Environment variables template
├── supabase.sql                 # SQL schema, RLS policies, and realtime publication
├── tailwind.config.js           # Custom cyberpunk color scheme and animations
├── vercel.json                  # SPA routing configuration for Vercel
└── package.json
```

---

## 🚀 1. Installation Instructions

1. **Clone or navigate to the project directory**:
   ```bash
   cd e:\GDR\BOTBLITZ
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

---

## 🗄️ 2. Supabase Setup Instructions

1. Go to [Supabase](https://supabase.com/) and create a new project (e.g. `botblitz-freshers`).
2. Once your database is provisioned, navigate to the **SQL Editor** in the left sidebar.
3. Open the file `supabase.sql` from the root of this project, copy its contents, paste them into the Supabase SQL Editor, and click **Run**.
4. This script automatically:
   - Creates the `public.scores` table with all required fields (`id`, `nickname`, `score`, `created_at`, `session_id`, `game_duration`).
   - Sets up high-performance B-tree indexes for descending scores and today's timestamp filtering.
   - Configures **Row Level Security (RLS)** allowing anonymous kiosk players to submit runs and view leaderboards without logging in.
   - Enables **Supabase Realtime** publication on `public.scores` so scores instantly stream to the TV.
5. In Supabase Dashboard, navigate to **Project Settings** → **API**.
6. Copy:
   - **Project URL** (`https://xyzcompany.supabase.co`)
   - **Project API anon public key** (`eyJhbG...`)

---

## 🔑 3. Required Environment Variables

Create a file named `.env` in the root of the project (copying from `.env.example`):

```bash
cp .env.example .env
```

Fill in your project credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Override the QR code URL (defaults to window.location.origin + '/play')
# Set this to your production domain once deployed to Vercel (e.g., https://botblitz.vercel.app/play)
VITE_PLAY_URL=https://botblitz.vercel.app/play
```

> **Note**: If environment variables are omitted or empty, BOT BLITZ operates in **Autonomous Demo Mode** using local browser storage and cross-tab event broadcasting, allowing full demonstration and testing before connecting to the cloud.

---

## 💻 4. Local Development Instructions

Start the Vite development server:

```bash
npm run dev
```

Open two browser windows side by side to experience the kiosk setup:

1. **Mobile Play View**: [http://localhost:5173/play](http://localhost:5173/play)
   *(Press F12 in Chrome, toggle the device toolbar, and select iPhone 14 or Pixel 7)*
2. **Kiosk TV Leaderboard View**: [http://localhost:5173/leaderboard](http://localhost:5173/leaderboard)

Play a 60-second round on the mobile screen. When the game finishes, your score will immediately appear on the TV screen and trigger the animated high-score celebration!

To build for production:

```bash
npm run build
npm run preview
```

---

## 🌐 5. Deployment Instructions for Vercel

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Log into [Vercel](https://vercel.com/) and click **"Add New Project"** → **"Import Git Repository"**.
3. Vercel will automatically detect **Vite**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand the **Environment Variables** section and add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase Anon Key
   - `VITE_PLAY_URL` = `https://<your-vercel-domain>.vercel.app/play`
5. Click **Deploy**.
6. The included `vercel.json` ensures that direct browser visits to `/play` or `/leaderboard` are cleanly routed without 404 errors.

---

## 📺 6. Instructions for Opening the Leaderboard Fullscreen on a TV

For the Gaming & Robotics Society booth at Freshers Week:

1. Connect the kiosk TV to a laptop, Raspberry Pi, or Mini PC via HDMI (1080p or 4K resolution recommended).
2. Open Google Chrome, Brave, or Edge and navigate to:
   ```
   https://<your-deployment-url>/leaderboard
   ```
3. Enter Fullscreen Mode:
   - Click the **"TV FULLSCREEN"** button in the top right corner of the leaderboard, **OR**
   - Press **`F11`** on Windows/Linux or **`Cmd + Shift + F`** on macOS.
4. Unmute the sound using the speaker icon in the top right if your TV booth has speakers for celebratory champion fanfares.
5. The leaderboard updates **automatically in realtime** without requiring any manual browser refreshing.

---

## 📲 7. Instructions for Replacing the Temporary QR Code with the Production URL

The QR code on the TV leaderboard dynamically links to the game route.

1. **Automatic Mode (Default)**:
   - If `VITE_PLAY_URL` is not set in `.env`, the QR code automatically uses `window.location.origin + '/play'`.
   - When deployed to `https://botblitz.vercel.app`, the QR code automatically encodes `https://botblitz.vercel.app/play`.

2. **Custom / Shortlink URL**:
   - If your society has a custom shortlink (e.g. `https://qr.robotics.soc/play` or `https://society.ac.uk/blitz`), set it in `.env` or your Vercel Project Settings:
     ```env
     VITE_PLAY_URL=https://society.ac.uk/blitz
     ```
   - Re-deploy or restart the dev server. The QR code will immediately update to encode your custom link!

---

## 🛡️ Anti-Cheat & Fair Play Guarantee

- **Session Timing Verification**: Games lasting less than 53 seconds are automatically flagged and rejected.
- **Event Audit Trail**: All collected batteries, energy cores, and hazard collisions are timestamped in a session ledger and audited against the reported score.
- **Rate Limiting**: Devices are restricted from submitting multiple scores within 45 seconds of each other.
- **Profanity Sanitization**: Nicknames with profanity, HTML tags, or script tags are scrubbed and rejected before submission.

---

## 🏆 University Society Attribution

Created with ❤️ by the **Gaming & Robotics Society** for Freshers Week.
For support or tournament kiosk inquiries, contact the society tech committee.
