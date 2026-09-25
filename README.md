# downstack-practice

A website for practising Tetris downstacking, T-spins, quads, perfect clears and more.

**Play it:** https://mickacka.github.io/downstack-practice/ (the home page lists every mode)

This is a fork of [himitsuconfidential/downstack-practice](https://github.com/himitsuconfidential/downstack-practice) ([original site](https://himitsuconfidential.github.io/downstack-practice/)).

## Modes

| Page | What you practise |
| --- | --- |
| [Downstack Practice](https://mickacka.github.io/downstack-practice/downstack.html) | Combo, combo into PC / quad / TSD, and pure downstack maps |
| [T-Spin Challenge](https://mickacka.github.io/downstack-practice/tspin-challenge.html) | Solve as many T-spin puzzles as you can and get on the leaderboard (try to reach the top 50 :>) |
| [T-Spin Practice](https://mickacka.github.io/downstack-practice/tspin-practice.html) | T-spin setups |
| [Advanced T-Spin Practice](https://mickacka.github.io/downstack-practice/advance-tspin-practice.html) | Harder T-spin setups |
| [All-Spin Practice](https://mickacka.github.io/downstack-practice/allspin-practice.html) | Build S, Z, L, J, I or T spin setups inside a flat well and spin into them for the requested line clears, two spins per map (see below) |
| [Quad Practice](https://mickacka.github.io/downstack-practice/quad-practice.html) | Building and clearing quads |
| [Upstack Practice](https://mickacka.github.io/downstack-practice/upstack-practice.html) | Stacking |
| [Mid-game PC Practice](https://mickacka.github.io/downstack-practice/pc-practice.html) | Perfect clears from a mid-game board |
| [Usermode](https://mickacka.github.io/downstack-practice/usermode.html) | Your own board and queue, shareable by URL |
| [Learn from AI](https://mickacka.github.io/downstack-practice/learnfromai.html) | Puzzles taken from ZZZTOJ's play |
| [PC Setup Library](https://mickacka.github.io/downstack-practice/library.html) | Ready-made usermode links for common PC setups |

## While you practise

- **Undo** (U, or the Undo button) takes back the last piece; **Retry** restarts the map.
- **Show Answer** replays the solution one piece at a time, in the order you place them.
- **Finesse feedback**: after each piece placed without soft drop, the board shows whether you used the fewest inputs for that spot (taps, DAS to the wall and rotations each count 1) and keeps a running score. Turn it off in Settings.
- **Daily** (button, or *Today's puzzles* on the home page) plays the day's map for that mode: the same map for everyone, new every day (UTC). Solving any daily keeps your daily streak going.
- **Copy link** copies a link to the exact puzzle on screen, to retry later or send to a friend.
- Every attempt ends with a ✓ / ✗ over the board, and your solved count, streak and best streak are kept per mode (also shown on the home page).

## All-Spin Practice

- Each map is a flat stack with a 3-6 wide well and asks for **two spins in a row** (or one, in Options). Build the first setup inside the well (it fills about level with the walls, leaving the way into the slot) and spin in; the lines it clears leave the base for the second setup, which you build and spin into the same way.
- After the last spin the well is clean: the way into the slot goes straight down to the hole in the garbage, with nothing left covering it.
- A spin follows the all-spin rule: after its last rotation the piece can't move left, right or up.
- Only the requested spins count, in order: the right piece, a real spin, and the right number of lines (e.g. an S-Spin **Double**, then a T-Spin **Double**). The goal ticks off each one as you do it; if you miss, the page says why.
- **Show Answer** replays the solution one piece at a time, in build order, showing where each spin piece goes and the lines it clears.
- Options: spins per map (2 or 1), which pieces can be the spin piece, about how many pieces per spin, and unique pieces. Every map is checked to be buildable with the game's real moves.

## Map parameters

You can change how maps are generated:

- **Beginners** can set the **number of pieces to 5** to make the game easier.
- **Advanced players** can choose **more garbage holes**, **more skims** and **non-unique pieces** to make it harder.

## Settings

Open the ⚙️ menu to set:

- Keybinds (with Reset to defaults; keys used twice are highlighted), DAS and ARR
- Whether a new map is generated when you win
- **Gravity**: *Off* (default) lets you take your time; the other speeds make pieces fall on their own and lock 0.5 s after landing (moving or rotating on the ground resets that, up to 15 times). Gravity pauses while the board is out of focus or the settings are open
- **180° kicks**: *TETR.IO (SRS+)* (default) tries the same kicks as TETR.IO when a 180° flip is blocked; *Simple* keeps the original single kick. Maps are generated with the simple kicks, so every map can be solved with either setting
- **Touch controls**: *Auto* shows on-screen buttons on phones and tablets, *On* / *Off* force them

Settings are saved in your browser.

## Playing on a phone

With touch controls on:

- **Landscape** works like a gamepad: the board fills the height in the middle, movement buttons sit bottom-left and rotations / hold bottom-right, as wide as the space beside the board allows.
- **Portrait** shows the whole page zoomed to fit, with the panels on top, a large board and big touch buttons across the full width, so everything is visible without scrolling.

Buttons light up while you hold them.

Hold a direction button to move the piece all the way (DAS); long-pressing no longer brings up the Android menu.

**Install it as an app**: on Android, use the *Install as an app* button on the home page (or Chrome's menu > *Add to Home screen*); on iPhone, Safari's Share > *Add to Home Screen*. It then opens full screen and works offline. Whenever you're online, every page is checked against the site, so updates show up on the next load.

## Running locally

The site is plain HTML/JS with no build step. Pages link to `/downstack-practice/...`, so serve the **parent** folder:

```sh
cd ..
npx http-server -p 8000
# open http://localhost:8000/downstack-practice/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/static.yml`.

## License

This software uses the Apache License 2.0.
