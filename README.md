# downstack-practice

A website for practising Tetris downstacking, T-spins, quads, perfect clears and more.

**Play it:** https://mickacka.github.io/downstack-practice/

This is a fork of [himitsuconfidential/downstack-practice](https://github.com/himitsuconfidential/downstack-practice) ([original site](https://himitsuconfidential.github.io/downstack-practice/)).

## Modes

| Page | What you practise |
| --- | --- |
| [Downstack Practice](https://mickacka.github.io/downstack-practice/) | Combo, combo into PC / quad / TSD, and pure downstack maps |
| [T-Spin Challenge](https://mickacka.github.io/downstack-practice/tspin-challenge.html) | Solve as many T-spin puzzles as you can and get on the leaderboard (try to reach the top 50 :>) |
| [T-Spin Practice](https://mickacka.github.io/downstack-practice/tspin-practice.html) | T-spin setups |
| [Advanced T-Spin Practice](https://mickacka.github.io/downstack-practice/advance-tspin-practice.html) | Harder T-spin setups |
| [All-Spin Practice](https://mickacka.github.io/downstack-practice/allspin-practice.html) | Build an S, Z, L, J, I or T spin setup from a flat board, then spin into it (the piece can't move left, right or up after its last rotation) |
| [Quad Practice](https://mickacka.github.io/downstack-practice/quad-practice.html) | Building and clearing quads |
| [Upstack Practice](https://mickacka.github.io/downstack-practice/upstack-practice.html) | Stacking |
| [Mid-game PC Practice](https://mickacka.github.io/downstack-practice/pc-practice.html) | Perfect clears from a mid-game board |
| [Usermode](https://mickacka.github.io/downstack-practice/usermode.html) | Your own board and queue, shareable by URL |
| [Learn from AI](https://mickacka.github.io/downstack-practice/learnfromai.html) | Puzzles taken from ZZZTOJ's play |
| [PC Setup Library](https://mickacka.github.io/downstack-practice/library.html) | Ready-made usermode links for common PC setups |

## Map parameters

You can change how maps are generated:

- **Beginners** can set the **number of pieces to 5** to make the game easier.
- **Advanced players** can choose **more garbage holes**, **more skims** and **non-unique pieces** to make it harder.

## Settings

Open the ⚙️ menu to set:

- Keybinds, DAS and ARR
- Whether a new map is generated when you win
- **Touch controls**: *Auto* shows on-screen buttons on phones and tablets, *On* / *Off* force them

Settings are saved in your browser.

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
