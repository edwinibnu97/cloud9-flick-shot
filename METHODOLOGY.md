# Cloud9 Flick Shot — Methodology

**Project:** Cloud9 Flick Shot — a 60-second aim trainer mini game
**Hackathon:** Cloud9 x JetBrains: Sky's The Limit Hackathon 2026
**Category:** 3 — Event Mini Game
**Demo:** https://edwinibnu97.github.io/cloud9-flick-shot/
**Repository:** https://github.com/edwinibnu97/cloud9-flick-shot

## 1. The problem

Event booths are a hostile environment for a game. The audience is a queue of
people who have never seen the game before, each of them gets one short turn,
there is usually no reliable Wi-Fi, and nobody reads instructions. A booth
mini game therefore has to solve four problems at once:

1. **Instant understanding** — a passer-by must know what to do within
   seconds, with no tutorial.
2. **Fast player turnover** — one session must end cleanly and the next player
   must be able to start immediately, with no leftover state.
3. **Replayability in under 3 minutes** — a short, complete loop that invites
   one more try, and a reason to compare scores with the people around you.
4. **No infrastructure** — no accounts, no server, no network dependency.

## 2. Approach

We built a single-screen aim trainer: glowing targets appear at random in a
dark blue arena and the player clicks them as fast and accurately as possible
for exactly 60 seconds. The design decisions follow directly from the four
problems above:

- **60-second sessions.** Short enough for a queue, long enough for a real
  skill gap to show. The session length is fixed and visible in the HUD.
- **Mouse-only controls, no tutorial.** The only interaction is clicking a
  target. The menu explains the game in one sentence; the attract mode (see
  below) demonstrates it without words.
- **Instant reset.** "Play Again" goes straight back to the 3-2-1-GO
  countdown. No state carries over between players except the shared local
  leaderboard.
- **Local leaderboard, no Wi-Fi.** The top 10 scores are stored in the
  browser's `localStorage`. It works fully offline, needs no account and no
  server, and it is exactly what a booth crowd needs: a visible ranking to
  beat.
- **Attract mode.** When nobody is playing, the menu screen runs an automatic
  demo behind it: targets keep spawning and "shoot" themselves with the same
  burst and floating-score effects as a real hit, and a blinking
  "CLICK TO PLAY" hint invites the next player. The screen never looks dead,
  and a passer-by learns the mechanic by watching. Attract mode stops
  cleanly the moment a round starts, and the score screen returns to it
  automatically after 20 seconds of inactivity.
- **Original art only.** Every visual is drawn in code (Canvas gradients,
  glows, particles). No third-party assets, and no VALORANT / League of
  Legends names or artwork.

## 3. How the game works

- **Targets.** Spawn at random positions (26–52 px radius, max 3 on screen).
  Spawn interval tightens from 720 ms to 420 ms and target lifetime shrinks
  from 1150 ms to 770 ms as the round progresses, so the last seconds are
  the hardest.
- **Scoring.** A hit is worth 100 points plus 10 per combo level (combo
  capped at +200). Chained hits without a miss build the combo; clicking
  empty arena counts as a miss and resets it. The HUD shows score, time,
  combo multiplier and hit count.
- **End of round.** The score screen shows total points, accuracy, hits,
  misses and best streak. The player can save the score to the local top 10
  under a short tag, play again instantly, or go back to the menu.
- **Feedback.** Hit bursts (particles), floating "+points" text, and
  WebAudio blips generated in code — no audio files. A mute toggle is in
  the top bar. The game also works with touch (pointer events).

## 4. Technology

- **Stack:** HTML5 Canvas + vanilla JavaScript, plain CSS. Single-page
  static site, no dependencies, no build step, no server.
- **Hosting:** GitHub Pages (free). The game runs entirely in the browser,
  so judges can play it from the demo link with no install.
- **Testing:** Playwright end-to-end smoke tests against the live demo —
  menu → countdown → real hits detected by canvas pixel scan → score
  screen → save score → Play Again, plus attract-mode verification
  (targets spawn and auto-shoot on the idle menu, score screen returns to
  the menu after 20 s idle). Zero console/page errors.

## 5. Tooling — an honest note

This build was written with a standard code editor. The free JetBrains trial
codes for this hackathon had **not arrived yet** at the time this code was
written, so no JetBrains IDE was used for it, and no `.idea` / `.junie` /
`.air` folders are committed — we do not claim JetBrains tool usage we have
not done. Once the trial codes arrive, the project will be rebuilt in
WebStorm with JetBrains Air, and the tooling evidence (`.idea` / `.junie`
folders) will be committed then, before submission.

## 6. What remains before submission

- Demo video (≤ 3 minutes, public on YouTube, English on-screen captions).
- The JetBrains rebuild described above, once the trial codes arrive.
- Optional second mode ("Reaction" drill) if time allows — it is not
  required for the submission.
- Final Devpost submission (Category 3) before the deadline.
