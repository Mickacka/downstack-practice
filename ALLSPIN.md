# All-Spin Practice: guide and generator notes

Page: [`allspin-practice.html`](allspin-practice.html) · code: [`allspin.js`](allspin.js) (+ shared code in `header.js`, `common.js`, `mapgen.js`)

This file explains how to play the mode, then how every map is generated and checked, so that someone can change the generator without breaking it.

---

## 1. Playing

### The goal

Each map asks for **several spins in a row**: 1 to 4 (*Options > Spins per map*, default 2), for example:

> S-Spin → T-Spin

(The lines to clear are named only with *Line clears: Mix*, e.g. *S-Spin Single → T-Spin Double*; otherwise I-spins are singles and the others are what the option says.)

For each spin:

1. **Build the setup** with the pieces in your queue, inside the well and on the stack right beside it.
2. **Spin the last piece into the slot** so it clears the requested number of lines.

The lines cleared by each spin leave the base for the next setup, in the same well. The goal ticks off each spin as you do it (✓).

### What counts as a spin

The **all-spin rule** is used (TETR.IO style, for every piece):

- the piece's **last move is a rotation**, and
- after that rotation it **can't move left, right or up**.

The requested spin only counts if it is **the right piece**, **a real spin**, and clears **exactly the requested number of lines**. Spins must also happen **in order**. When you miss, the page says why:

- *"The S wasn't a spin: rotate it into the slot as its last move"*
- *"S-Spin, but it cleared no lines"*
- *"That was an S-Spin Single, not a Double"*

The map is won as soon as every requested spin is done (pieces left in the queue aren't needed); if the queue runs out first, it's ✗ and the map restarts.

### 1.1 Continuous mode (option)

Normally a map is planned in full at the start: every setup, every piece, the whole stack. The later spins are built on the board the *planned* solution leaves. If you build a setup differently, the pieces above its spin rows may be in other places after the spin, and a later spin can become impossible. (Differences inside the spin rows don't matter: those rows are cleared.)

With **Continuous** on, the game goes on in parts:

1. A part is planned as usual (*Spins per map* spins, 2 by default), with its queue.
2. When you finish it, the next part is planned **from your board as it is**, so it works whatever way you built:
   - the same pieces stay, and your pieces count as solid, so new stack may go on top of them;
   - the well is found again on the current board (a 3-6 wide window around the deepest column, preferably no higher than the columns on each side);
   - **garbage** rises from the bottom, as many rows as the part cleared (up to 8 rows of stack), with the holes lined up under the columns that are empty all the way down (the well's open shaft), so no hole is ever covered;
   - the new part must keep the board at 12 rows or lower;
   - **look-ahead**: a part is only kept if the board its planned solution leaves still has a next part (so if you build as planned, the game can go on). The first part of a map is chosen the same way.
3. A part is done as soon as its last spin lands; the next one starts right away (pieces left over are dropped). If you miss a part, it restarts from its own start: the **checkpoint** (your earlier pieces included). Undo works within a part.
4. If nothing fits your board (within about 1.5-2.5 s, or 3 times that when planned in the background), the game goes on with a **new board** ("Part N · new board"). On a board the look-ahead can't plan past, a part without it is tried first.
5. **No pause between parts**: while you play a part, the next one is planned in the background (a Web Worker, `allspin-worker.js`) from the board the planned solution leaves. If you finish with the same cells filled (whatever pieces you used where), that plan is used at once; otherwise the next part is planned from your board then (up to about 2 s).

The goal shows *Part N: …*. In testing (5 pieces per spin, playing the planned solutions), about 1 checkpoint in 4 went on with a new board before well moves and donations (3.6) and the longer background search; now about 1 in 7, and the pause between parts was about 2 s before background planning (now about 10 ms when you finish as planned). Continuous mode is off in the daily puzzle.

### Options (right panel, saved in the browser)

| Option | Default | Effect |
| --- | --- | --- |
| Spins per map | 2 | 1 to 4 spins in a row (in continuous mode: per part) |
| Line clears | Doubles | Doubles, Singles (see 3.10) or a mix (each spin of a map drawn single or double). The I-spin is always a single. The daily always has doubles. |
| Continuous | off | When the planned spins are done, the next ones are planned from your board as it is (see 1.1) |
| Pieces per spin, about | 5 | Size of each setup: build pieces + the spin piece (3-7). The generator may use one more or one less. |
| No repeated pieces | on | Each piece type at most once per setup (a spin piece is never also a build piece). Off: up to twice. |
| Spin pieces | S Z L J I T | Which pieces can be the spin piece |

### Tools

- **Review my board after a miss** (option, on by default): when a map is missed, the board stays as you left it, with the planned setup for the missed spin over it: its pieces dashed in their colours where you left a gap, and the slot outlined in the spin piece's colour, with a red cross where you put a piece in it (it had to stay empty). Any key or tap on the board goes on to the retry. Not in a rush, where a miss moves on.
- **Next pieces shown** (option, 5 by default): show only 1 to 5 of the next pieces (the rest show a "?"), so you plan the setup with less of the queue in sight and have to remember or decide earlier where each piece goes.
- **Focus on my weak spins** (option): the spin pieces you miss more often come up more often (a weight from 1 to 7 by miss rate; a piece never tried counts as half missed). Not in the daily. Your results per spin ("L-Spin Double: 7 of 10") are on the Progress page, weakest first, with your Find the slot score.
- **Find the slot first** (option, a vision drill): before each new map (and each new part in continuous mode), tap the 4 cells where the first spin piece will end, before any piece is placed, so you have to picture the finished setup. After the 4th cell the slot is shown: your right cells in green, wrong ones crossed in red. Then you play. Tapping a picked cell again unpicks it; Show Hint gives up (not counted). Your score ("found 7/10") is kept in the browser. A retry of the same map doesn't ask again.
- **Show Hint** gives hints for the next spin, one more each press, so you take only as much help as you need:
  1. the rows the spin piece ends in (a dashed band);
  2. the setup to build: the pieces still to place, outlined in their colours (only where nothing is placed yet);
  3. the slot itself (where the spin piece has to end up), in the spin piece's colour.

  The 4th press hides it (the button reads *Show Hint*, *More Hint*, *Hide Hint*); it turns off when the map restarts.
- **Show Answer** replays the solution one piece at a time, in placement order. Each spin piece is then moved in from spawn with the fewest inputs, so you see how it gets into the slot, and its lines clear before the next setup. With the option *Show Answer: write the inputs* (off by default), the inputs are also written out as they happen (e.g. *T-Spin Double: ← ← ← ↺ ↓ ↺*).
- **Undo** (U) takes back a piece, **Retry** restarts the map, and **Copy link** copies a link to this exact map.
- **Daily** plays today's map, the same for everyone (see section 5). **Rush (3 min)** gives you as many maps as you can solve in 3 minutes.
- Settings shared with every page: keys, DAS/ARR, finesse feedback, 180° kicks, gravity, and the touch controls and their layout.

---

## 2. Anatomy of a map

This is a schematic, not an exact board (`#` stack, `.` empty):

```
            stack              well               stack
      (a little uneven)     (3-6 wide)      (a little uneven)
          #  .  #  #   |  .  .  .  .  |   #  .  .
          #  #  #  #   |  .  .  .  .  |   #  #  .      <- the build fills the well about level with the
          #  #  #  #   |  .  .  .  .  |   #  #  #         stack, and may also go on the stack beside it
      ----#--#--#--#---|--.--S--S--.--|---#--#--#----   <- spin rows: the slot (S) plus cells you build;
      ----#--#--#--#---|--.--.--S--S--|---#--#--#----      the spin clears them
          #  #  #  #   #  #  #  #  .  #   #  #  #      <- garbage floor (0-2 rows), with one hole
```

| Term | Meaning |
| --- | --- |
| **Well** | The columns (3-6 wide) where the setup is built. The stack on both sides starts out taller. |
| **Slot** | The 4 cells where the spin piece ends up. It is always *flat*: S, Z, L, J lying down, I horizontal, and T pointing down (the T-spin double shape). |
| **Spin rows** | The rows of the slot (1 for I, 2 for the others). After the spin they are full and clear: I-Spin Single, otherwise Doubles (for a single, only the bottom row is full: 3.10). |
| **Caps** | Build cells just above the slot. They make the overhang the spin piece has to rotate under. |
| **Open columns** | Slot columns with no cap: the way into the slot. After the last spin they are clear all the way down to the garbage hole. |
| **Stack / walls** | Grey cells outside the well, a little uneven like a mid-game board (each column at most 1 row above or below the others' level). The starting board never has grey cells over empty ones. |
| **Garbage floor** | 0-2 rows under the spin rows, with a single hole under an open column. |
| **Pockets** | Cells of the spin rows no piece could ever reach (e.g. under a T's arms in a 3-wide well). They are part of the stack instead of being built. |

---

## 3. How a map is generated

Everything happens in `play_a_map()` when you press *New All-Spin Map*, solve a map (with *Generate new map on win*), or load the page.

### 3.1 Overview

```
play_a_map
 ├─ up to 10 attempts at chain_setup(k, n), k = Spins per map:
 │   ├─ first = first_setup(n)            the first spin (always succeeds, see 3.2)
 │   │   rejected unless the start is clean and chain_works (3.6)
 │   └─ k − 1 times: next_setup(chain, n)  one more spin on what the chain leaves (3.6),
 │         kept only if the new starting board is clean and chain_works
 ├─ nothing worked (rare): the same with fewer spins, down to one
 ├─ Record.spins  = [{piece, lines, cells, build}, ...]
 ├─ Record.board  = [starting board]     only its 'G' cells are shown at the start
 └─ Record.shuffled_queue                (3.9)
```

`n` = *Pieces per spin* − 1, the number of build pieces per setup.

### 3.2 `first_setup(n)`: picking the spin piece

The spin pieces allowed in the options are shuffled. For each one, `try_spin_setup(piece, size)` is called again and again for up to **700 ms**. Each call uses a size near `n`: `n` three times as likely as `n+1` or `n-1`. If a piece doesn't work out in time, the next one is tried. Picking the piece before the attempts, not per attempt, keeps rarer setups like T from being crowded out. As a last resort it tries any piece at any size until one works.

Every single attempt has a **100 ms deadline** (`Record.deadline`). The deep searches (`carve`) stop when it passes.

### 3.3 `try_spin_setup(piece, n)`: the first slot

1. **Slot shape** (`slot_shape`): a flat orientation (T: pointing down only; others: flat, either way up).
2. **Well width** from the slot width up to 6:
   - a width is allowed when the build would reach a wall height of about 1-6 rows: `(4n − (spin_rows·w − 4)) / (w − 1 + 2)` between 1 and 6 (the 2 is roughly what the stack beside the well can take);
   - half the time the choice is limited to widths ≤ 4 (mid-game-like wells) when any are allowed.
3. **Position**: the well goes anywhere on the board, the slot anywhere inside the well, and the floor 0-2 rows up.
4. **Board so far**:
   - the floor rows are all garbage (`G`) for now; the hole is dug later, see 3.4;
   - in the spin rows, cells outside the well are `G`, the slot is empty, and every other well cell is `B` (to build).
5. **Pockets** (`fill_pockets`): groups of `B` cells in the spin rows that don't reach the slot's top row are shut in (no piece could get there), so they become `G`.
6. Then `finish_setup` does the rest (3.4).

### 3.4 `finish_setup`: caps, stack, build (shared by both spins)

1. **A little uneven stack** (`terrain_bumps`): a random walk outwards from each side of the well gives each outside column an offset of −1, 0 or +1. It starts level two times in three, and changes by 1 step one column in three. A column's height above the spin rows is `wall + offset`. The columns touching the well stay at least 1 high, so the well is still a well.
2. **Cells to build above the spin rows**: `need = 4n − (B cells in the spin rows)`.
3. **Side columns**: up to 2 columns on each side of the well can take build pieces too. They fill the stack's dips and can go up to 3 rows above the wall height.

   **The stack only grows up from stack**: new stack cells are only added on top of stack, never above a cell you build. This matters for the later spins: where an earlier build put pieces beside the well, a later setup's stack stops below them (3.6). So the starting board never has stack floating over empty cells.
4. **Caps and the garbage hole**: for every way of capping the slot columns (at most 16), the code checks the slot on a board with walls and caps of height 1:
   - The slot must be a **spin slot** (`is_spin_slot`): the piece fits there, can't move left, right, up or down from there, and can be reached from spawn (3.7).
   - For the first spin, the garbage hole is dug under one of the open columns, and the slot is checked again with it.
   - For the later spins, the open columns must include `must_open` (3.6).

   One valid capping is picked at random.
5. **Wall height**: the lowest height from 1 to 6 whose range (every build column one row lower, up to one row higher in the well and three rows higher beside it) contains `need`. A shallow well keeps the way into the slot open, which narrow wells need.
6. **Room to spawn**: the stack, walls + 3, must stay at row 16 or lower.
7. **Build shapes**:
   - every combination of column heights is enumerated: well columns at wall −1..+1, side columns at wall −1..+3 (adding nothing where the stack is already higher);
   - only combinations with exactly `need` cells are kept, and duplicates are dropped;
   - they are scored flattest first: +1 per well column off the wall height, +¼ per cell on the side stack, plus a random tie-break;
   - boards are built only for the best candidates, until 4 pass these checks:
     - every group of touching build cells is a multiple of 4 cells (`groups_of_four`), which tetrominoes need;
     - no row above the spin rows is full, since a line would clear while you build.
8. For each of those 4: check again that the slot is a spin slot, then **split the build into pieces** (`carve`, 3.5). The first one that works is the setup:
   - the finished board with each build piece in its colour;
   - the slot cells, the number of lines, and the well's `left`, `right`, `bottom`, `top`.

   For a spin single, see 3.10 (a gap in the top spin row, before step 2).

### 3.5 `carve`: splitting the build into placeable pieces

This works backwards, like the other modes' generators: it removes pieces from the finished build, top first, so the player places them in the reverse order.

- The highest (then leftmost) remaining cell must belong to the next piece removed. Every piece type, orientation and position covering it with build cells only is tried, in random order.
- A candidate is accepted when:
  - it respects **No repeated pieces** (`is_even_distributed`): each type at most once (twice when off), minus one for the spin piece;
  - it **rests** on something (the floor, the stack, or a piece placed before it);
  - it is **reachable**, either with nothing above it (a straight hard drop) or through the move search (3.7), on the board as it will be when the player places it.
- It recurses on the remaining cells and backtracks when stuck. It gives up at the attempt's deadline.

### 3.6 The later spins: `next_setup`, `try_second_setup`, `chain_start`, `chain_works`

The setups form a chain; each one after the first is built on what the previous spin leaves:

1. `R = after_spin(previous)`: the previous setup built, its spin piece in the slot, and the full rows cleared. That's the board you'll have after that spin.
2. **The well**: the same as before, or half the time one **moved** up to 3 columns left or right (3-6 wide), as after a T-spin. The new slot is **dropped** onto `R` like a hard drop at a random column of the well. It rests where it lands, so its spin rows sit on what the earlier setups left.
3. **`must_open`**: well columns with an empty cell right under the new spin rows. These are the previous slot's entry, down to the garbage hole. Such a column must be an *open* column of the new slot, so that after the new spin it is clear all the way down (clean well). A slot that doesn't cover them is rejected.
4. Empty cells outside the well, up to the new spin rows, are filled. A cell with stack under it becomes stack. A cell over a piece of an earlier build becomes `B` if it is in the spin rows (you build it).
   **Donation**: below the spin rows, an empty cell that isn't over stack (the old well once the well has moved, or a gap beside the well) stays empty. The build covers that column **in the spin rows only**: nothing is built or stacked above them there (no wall goes over a `B` cell, and side-build columns skip it). So the spin clears the cover and the shaft is open again, like a T-spin placed over the well. Not for a single, whose top row stays (that slot is rejected instead). Empty well cells in the spin rows become `B`. There are no pockets here: a pocket would float in the middle of the well at the start.
5. `finish_setup` as in 3.4 (without digging a hole). The stack only grows up from stack, never over an earlier build's pieces.
6. **Starting board** (`chain_start`): the first setup's board, plus each later setup's new stack cells moved up by all the lines cleared before it (`row_at_start`). They must fit at row 16 or lower.
7. **`chain_works`**: the whole solution is played on the real starting board. Every build piece must be reachable where it goes (3.7), every slot must be a spin slot (`slot_pose` finds the piece's position) that clears exactly its lines, and the board must be clean after the last spin (3.8). This catches a later setup's taller stack getting in the way of an earlier one.

Each call to `next_setup` tries for up to **500 ms**, with random spin pieces from the options and sizes near `n`. If a spin can't be added, the whole chain starts again (up to 10 times), then with one spin fewer.

### 3.7 Reachability: `can_reach`

This is a breadth-first search over the player's real moves from the spawn position (x 4, y 18, flat):

- left, right;
- a **sonic drop** (all the way down; there is no gravity and soft drop is instant, so there are no one-row drops);
- rotate clockwise, counter-clockwise and 180.

It uses the game's own SRS kicks. For 180 it uses the **simple** kick table, which is a subset of TETR.IO's SRS+ table, so every map can be solved with either *180° kicks* setting. The search succeeds when the piece covers exactly the target cells, in any orientation that does.

`is_spin_slot` = the piece fits in the slot, can't move left, right, up or down from it, and `can_reach` finds it. So the only way in is a rotation, and it won't slide or fall afterwards.

### 3.8 Clean well

After the last spin, no empty cell has a filled cell above it, **anywhere on the board** (`clean_start(board, true)` in `chain_end`). Between spins a donation may cover a shaft for a while (3.6); by the end it must be open again. It holds by construction:

- the hole goes under an open column (3.4);
- each later spin keeps the previous entry open (3.6), or covers it only in its spin rows (a donation);
- side-stack cells sit on the stack.

The check stays as a safety net, and maps that fail it are dropped. In testing (2 spins), the second well moved in about 1 map in 7 and a setup covered a shaft in about 1 in 3.

### 3.9 The queue

For each spin: the build pieces in placement order (the reverse of `carve`'s removal order), then the spin piece. Each spin's list is shuffled on its own with `get_shuffled_holdable_queue` (`mapgen.js`). That picks an order you can still sort out with **hold** (the hold tables go up to 7 pieces, hence one list per spin), then the lists are joined. At the start, the first piece is put in hold.

---

### 3.10 Spin singles (option *Line clears*)

A single uses the same flat slot as a double (2 rows; the flat I is already a single), but **only its bottom row clears**:

- `wants_single` decides per spin (always for *Singles*; for *Mix*, from `Record.mix_plan`, drawn once per map so the doubles, which fit more easily, don't win most retries). Never in the daily.
- A single takes **one build piece less** (its spin rows have fewer cells to build), and the first spin's well is one column wider than the slot at least.
- In `finish_setup`, one cell of the slot's **top row** is left empty: the **gap**, in a well column that isn't a slot column, with something under it, and nothing built above it. For the first spin it must be right beside the slot's top row (elsewhere it mostly cuts off a column of the build); later spins take any column that works. Cells cut off by the gap (under it, in a narrow well) become stack, like a T-spin single's hole (`fill_pockets` again), and no side build goes past a gap at the edge of the well.
- The gap keeps the top row from clearing; its column stays open all the way up, so the well is clean at the end (checked by `chain_works` as for every map).
- Columns that must stay open to the bottom (the first spin's garbage hole, a gap under a later spin's rows) are the gap's, or a slot column with no slot cell in the top row: after the single, the top row stays and would cover them otherwise.
- `next_setup` tries the I-spin a quarter as often until near the end of its time: it fits far more easily and would take most later spins.

In testing (2 spins, 5 pieces per spin), every generated map was solved by playing its solution. With *Singles*, about half the spins are T/S/Z/L/J singles and half I-spin singles (the later spins are the hard ones: the well is set by the first spin and the previous gap must stay open), in about 0.5 s per map (up to 1.5 s). *Mix* gives about half singles, mostly I-spins. In continuous mode, parts take longer to plan (2-5 s with a new board).

Also used by doubles since this change: a way into the slot that leaves a cell to build in the top spin row, in an open column with nothing to build beside it, is skipped (nothing could fill that cell).

## 4. Checks every map passes

| Check | Where |
| --- | --- |
| Each spin slot can only be entered by a rotation, and the piece rests there | `is_spin_slot` (3.4, again in 3.6) |
| Every build piece rests on something and can be reached, in placement order | `carve` (3.5) |
| The whole solution plays out: each piece reachable, each slot a spin clearing its lines, clean well at the end, later stacks not blocking earlier setups | `chain_works` (3.6) |
| No line clears while you build; each spin clears exactly its rows | full-row check (3.4); spin rows = slot rows |
| The well is clean after the last spin | `is_clean` (3.8) |
| The starting board has no stack cell over an empty cell | `clean_start` (`play_a_map`) |
| No repeated pieces per setup (option) | `is_even_distributed` |
| The queue can be played in order with hold | `get_shuffled_holdable_queue` |
| Enough room to spawn | stack at row 16 or lower (3.4, 3.6) |

---

## 5. Daily map: same for everyone

`allspin-practice.html#daily` generates the day's map. `common.js` replaces `Math.random` with a generator seeded from the UTC date and the page name while the page loads. To give the same map on every device:

- the generator's time limits use `budget_clock()`, which counts calls instead of milliseconds while the daily map is being made (1 call ≈ ⅓ ms);
- the saved options are ignored, so the daily map uses the defaults: 2 spins, 5 pieces per spin, no repeated pieces, all spin pieces.

Changing the generator changes that day's daily map (it stays the same for everyone once deployed).

---

## 6. Tuning knobs

| What | Where | Now |
| --- | --- | --- |
| Well widths allowed | `try_spin_setup`: estimated wall height range | about 1-6 rows |
| Preference for narrow wells | `try_spin_setup`: `random_int(2)` | 50% of attempts limited to widths ≤ 4 |
| Floor height | `try_spin_setup`: `random_int(3)` | 0-2 garbage rows |
| Stack unevenness | `terrain_bumps` | offsets −1..+1, a step 1 column in 3 |
| Side build | `finish_setup`: `side_cols`, `high` | 2 columns each side, up to 3 above the wall |
| Build flatness | `finish_setup`: `low` / `high` for well columns, scoring | wall −1..+1 |
| Wall height range | `finish_setup` | 1-6 (lowest that fits) |
| Spawn room | `finish_setup`, `chain_start` | stack at row 16 or lower |
| Time limits | `first_setup` 700 ms per piece, `next_setup` 500 ms, 100 ms per attempt | |
| Attempts per map | `play_a_map` | 10 |

After a change, run the test in section 8.

---

## 7. Known limits

- **Slot shapes**: only flat slots (T: pointing down). No upright S/Z/L/J/I slots, no T-spin triples or minis. So spins are Doubles, or Singles with the *Line clears* option (3.10), and I-spins are Singles.
- **Well widths**:
  - with one spin they range over 3-6, with 3 or 4 wide in about half the maps;
  - with two or more spins, 3-6 wide, with 3 or 4 wide in about a third of the maps (3-wide is the rarest: the later setups can't use pockets, since they would float in the well).
- **Generation time**: about 0.1-0.2 s per map on a desktop (up to ~0.6 s), more on a phone.
- **At most four spins** per map. The more spins and the more pieces per spin, the taller the starting stack. With 3 pieces per spin, 4 spins make an 8-14 row stack. With big setups (5+ pieces each), 4 spins often don't fit under the spawn limit and the map falls back to fewer spins. 4-spin maps take about 0.6 s to generate on a desktop (up to ~3 s).

---

## 8. Testing the generator

In the browser console on `allspin-practice.html`, this plays maps through the real game (the same moves and rules as a player) and checks every one:

```js
// shortest move sequence from spawn to a resting placement covering `target`
function find_path(board, piece, target){
    const want = target.map(c => c.join()).sort().join('|')
    const g = new Game(); g.board = board; g.tetramino = piece; g.x = 4; g.y = 18; g.orientation = 0
    const key = (x, y, o) => x + ',' + y + ',' + o, names = ['L', 'R', 'D', 'CW', 'CCW', '180']
    const moves = [() => g.move_left(), () => g.move_right(), () => { const y = g.y; g.drop(); return g.y != y },
                   () => g.rotate_clockwise(), () => g.rotate_anticlockwise(), () => g.rotate_180('simple')]
    const seen = new Map([[key(4, 18, 0), null]]), queue = [[4, 18, 0]]
    for (let h = 0; h < queue.length; h++){
        const [x, y, o] = queue[h]
        for (let m = 0; m < 6; m++){
            g.x = x; g.y = y; g.orientation = o
            if (!moves[m]()) continue
            const k = key(g.x, g.y, g.orientation)
            if (seen.has(k)) continue
            seen.set(k, [key(x, y, o), m]); queue.push([g.x, g.y, g.orientation])
            const yy = g.y; g.y -= 1; const rests = g.is_collide(); g.y = yy
            if (rests && g.to_shape().map(c => c.join()).sort().join('|') == want){
                const path = []; let cur = k
                while (seen.get(cur)){ const [p, mm] = seen.get(cur); path.unshift(names[mm]); cur = p }
                return path
            }
        }
    }
    return null
}
// play the whole answer with the real controls; returns 'done' or what went wrong
function solve(){
    retry()
    const steps = []
    for (const s of Record.spins){ steps.push(...[...s.build].reverse()); steps.push({piece: s.piece, cells: s.cells}) }
    for (const [i, st] of steps.entries()){
        if (game.tetramino != st.piece){ if (game.holdmino == st.piece) game.hold(); else return 'piece ' + st.piece + ' not available at step ' + i }
        const path = find_path(game.board, st.piece, st.cells)
        if (!path) return 'no path at step ' + i
        game.x = 4; game.y = 18; game.orientation = 0
        for (const m of path) ({L: () => game.move_left(), R: () => game.move_right(), D: () => game.drop(),
            CW: () => game.rotate_clockwise(), CCW: () => game.rotate_anticlockwise(), '180': () => game.rotate_180()})[m]()
        Controls.harddrop()
    }
    return 'done'
}
// run: every map must end in a win (the stats of this mode get these attempts too)
let results = []; const report = report_result
report_result = won => results.push(won)
Config.auto_next_ind = false
const out = {won: 0, failed: []}
for (let i = 0; i < 20; i++){
    Config.spins = [1, 2, 2, 3, 4][i % 5]
    Config.no_of_piece = Config.spins > 2? 3: [4, 5, 6][i % 3]
    play_a_map(); results = []
    const r = solve()
    if (r == 'done' && results.length == 1 && results[0]) out.won++
    else out.failed.push(r + ' ' + Record.spins.map(s => s.piece + s.lines).join())
}
report_result = report
out
```

The last result should be `won: 20` and no `failed` entries. The latest run (1-4 spins, 3-5 pieces per spin): 31/31 won, all starting boards clean, and no hole anywhere on the final boards.

---

## 9. Code map (`allspin.js`)

| Function | Role |
| --- | --- |
| `load_gamemode` / `save_gamemode` | Options, from / to the page and localStorage (`allspin_*`) |
| `is_immobile`, `do_harddrop` | Spin detection on each drop, requested-spin bookkeeping, miss messages |
| `play_a_map`, `chain_setup`, `first_setup`, `next_setup` | Map assembly (3.1, 3.2, 3.6) |
| `chain_start`, `row_at_start`, `chain_works`, `slot_pose` | Starting board of a chain; playing the whole solution through (3.6) |
| `set_plan`, `next_part`, `plan_next_part`, `plan_from`, `well_candidates`, `add_garbage` | Continuous mode: starting a plan, planning the next part from the board in play, garbage (1.1) |
| `prepare_next_part`, `fill_key`, `allspin-worker.js` | Continuous mode: the next part planned ahead in the background |
| `new_map` | A new map (`play_a_map` without starting it) |
| `slot_shape`, `try_spin_setup`, `try_second_setup` | Slot placement for each spin (3.3, 3.6) |
| `finish_setup` | Caps, hole, bumpy stack, wall height, build shapes (3.4) |
| `terrain_bumps`, `fill_pockets`, `dig` | Bumpy stack, shut-in cells, garbage hole |
| `carve`, `is_even_distributed`, `groups_of_four`, `with_stacks` | Splitting the build into pieces (3.5) |
| `can_reach`, `is_spin_slot` | Reachability and spin checks (3.7) |
| `after_spin`, `is_clean`, `clean_start` | Board after a spin; clean well at the end (3.8); clean starting board |
| `play`, `detect_win`, `update_goal`, `spin_name` | Starting a map, judging it, the goal text |
| `show_ans`, `stop_answer`, `input_path` | Show Answer replay; the fewest inputs from spawn to a placement (for the spin pieces) |
| `toggle_hint`, `Controls.draw_overlay` | Show Hint: the next slot outlined over the board |
| `wants_single`, `draw_mix_plan` | Spin singles (3.10; the gap is made in `finish_setup`) |
| `spin_stats`, `log_spins`, `piece_order` | Results per spin; the spin piece order (Focus on my weak spins) |
| `start_review`, `draw_review`, `end_review` | Review after a miss |
| `start_finding`, `pick_cell`, `reveal_slot`, `draw_finding` | Find the slot (vision drill) |

Shared pieces live in `common.js`: result flash and stats, undo, share links, daily seeding and `budget_clock`, rush, finesse, and the touch controls.
