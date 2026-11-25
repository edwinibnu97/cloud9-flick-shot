# Cloud9 Flick Shot

A 60-second aim trainer mini game built for the **Cloud9 x JetBrains: Sky's The Limit Hackathon 2026** — **Category 3: Event Mini Game**.

Click the glowing targets as fast and accurately as you can. Chain hits to build your combo — a miss resets it. One session lasts exactly 60 seconds, then the score screen shows your accuracy, hits and best streak, and your score joins the local top-10 leaderboard.

## Play

- **Live demo:** _(deployment link added once live)_
- **How to play:** Click / tap the glowing targets. Hits score points (bigger combo = more points). Clicking empty arena counts as a miss and resets the combo.
- **Session:** 60 seconds, mouse-only (touch works too), no tutorial, instant reset between players — built for repeated booth play.
- **Leaderboard:** Top 10 scores are saved in the browser's `localStorage` — fully offline, no Wi-Fi needed, no account, no server.

## Run locally

No build step, no dependencies. Any static server works:

```bash
# Python
python3 -m http.server 8000
# then open http://localhost:8000

# or Node
npx serve .
```

Or just open `index.html` directly in a browser (sound needs a user gesture first, which the Start button provides).

## Stack

- HTML5 Canvas + vanilla JavaScript (single-page static site)
- CSS for the menu / HUD / score screens
- WebAudio blips for sound effects (generated in code, no audio files)
- All artwork is drawn in code (Canvas gradients) — no third-party assets, no Riot/VALORANT/League of Legends names or assets

## Project status

Scaffold stage (November 2026). The core loop is playable end to end: menu → countdown → 60-second round → score screen → local leaderboard → instant Play Again.

Planned next steps: polish (particles/sound tuning, idle attract screen), a second "Reaction" mode, the methodology write-up, the AI workflow story, and a ≤3-minute demo video.

**Note on tooling:** the JetBrains trial codes for this hackathon had not arrived yet when this scaffold was built, so no JetBrains IDE was used for this code and no `.idea` / `.junie` / `.air` folders are committed. The project will be rebuilt in a JetBrains IDE (WebStorm) once the trial codes arrive, and the tooling evidence will be committed then.

## License

MIT — see [LICENSE](LICENSE).
