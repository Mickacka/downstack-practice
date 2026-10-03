# tetrp (vendored)

TETR.IO replay engine by jush0147, MIT licence (see `LICENSE`):
https://github.com/jush0147/tetrp, commit 53b2b58a9f939191896801ebb049e32ecf96f13a (`src/`).

Used by `allspin-replays.html` to rebuild the boards of a `.ttr`/`.ttrm` replay
placement by placement. Only `src/` (engine, board, rules, data and `replay/`) is
copied; the viewer, the bot and the tests are not.

One change: the `lock` trace event in `engine.js` also carries the piece's
`cells` (`[x, row]`, rows counted from the top of the 40-row board, before the
lines clear), so each placement's cells are known without diffing boards.
