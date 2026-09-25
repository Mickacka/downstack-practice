# All-Spin Practice: guide and generator notes

Page: [`allspin-practice.html`](allspin-practice.html) · code: [`allspin.js`](allspin.js) (+ shared code in `header.js`, `common.js`, `mapgen.js`)

This file explains how to play the mode, then how every map is generated and checked, so that someone can change the generator without breaking it.

---

## 1. Playing

### The goal

Each map asks for **two spins in a row** (or one: *Options > Spins per map*), for example:

> Do an S-Spin Double, then a T-Spin Double

For each spin:

1. **Build the setup** with the pieces in your queue, inside the well and on the stack right beside it.
2. **Spin the last piece into the slot** so it clears the requested number of lines.

The lines cleared by the first spin leave the base for the second setup, in the same well. The goal ticks off each spin as you do it (✓).

### What counts as a spin

The **all-spin rule** is used (TETR.IO style, for every piece):

- the piece's **last move is a rotation**, and
- after that rotation it **can't move left, right or up**.

The requested spin only counts if it is **the right piece**, **a real spin**, and clears **exactly the requested number of lines**. Spins must also happen **in order**. When you miss, the page says why:

- *"The S wasn't a spin: rotate it into the slot as its last move"*
- *"S-Spin, but it cleared no lines"*
- *"That was an S-Spin Single, not a Double"*

The attempt is judged when the queue is used up: every requested spin done means ✓, otherwise ✗ and the map restarts.

### Options (right panel, saved in the browser)

| Option | Default | Effect |
| --- | --- | --- |
| Spins per map | 2 | 1 or 2 spins in a row |
| Pieces per spin, about | 5 | Size of each setup: build pieces + the spin piece (3-7). The generator may use one more or one less. |
| No repeated pieces | on | Each piece type at most once per setup (a spin piece is never also a build piece). Off: up to twice. |
| Spin pieces | S Z L J I T | Which pieces can be the spin piece |

### Tools

- **Show Hint** outlines the slot of the next spin (where the spin piece has to end up), in the spin piece's colour, and leaves the build to you. Press again to hide it; it turns off when the map restarts.
- **Show Answer** replays the solution one piece at a time, in placement order. It shows where each spin piece goes and the lines it clears before the next setup.
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
| **Spin rows** | The rows of the slot (1 for I, 2 for the others). After the spin they are full and clear: I-Spin Single, otherwise Doubles. |
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
 ├─ up to 10 attempts:
 │   ├─ first  = first_setup(n)          the first spin (always succeeds, see 3.2)
 │   ├─ reject it unless the well is clean after its spin            (3.8)
 │   │   and the starting board has no stack over an empty cell
 │   ├─ one spin asked: done
 │   └─ second = second_setup(first, n)  the second spin on what the first leaves (3.6)
 │         reject unless the well is clean after the second spin and the
 │         starting board has no stack over an empty cell
 ├─ nothing worked (rare): a clean single-spin map
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

   **The stack only grows up from stack**: new stack cells are only added on top of stack, never above a cell you build. This matters for the second spin: where the first build put pieces beside the well, the second setup's stack stops below them (3.6). So the starting board never has stack floating over empty cells.
4. **Caps and the garbage hole**: for every way of capping the slot columns (at most 16), the code checks the slot on a board with walls and caps of height 1:
   - The slot must be a **spin slot** (`is_spin_slot`): the piece fits there, can't move left, right, up or down from there, and can be reached from spawn (3.7).
   - For the first spin, the garbage hole is dug under one of the open columns, and the slot is checked again with it.
   - For the second spin, the open columns must include `must_open` (3.6).

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

### 3.5 `carve`: splitting the build into placeable pieces

This works backwards, like the other modes' generators: it removes pieces from the finished build, top first, so the player places them in the reverse order.

- The highest (then leftmost) remaining cell must belong to the next piece removed. Every piece type, orientation and position covering it with build cells only is tried, in random order.
- A candidate is accepted when:
  - it respects **No repeated pieces** (`is_even_distributed`): each type at most once (twice when off), minus one for the spin piece;
  - it **rests** on something (the floor, the stack, or a piece placed before it);
  - it is **reachable**, either with nothing above it (a straight hard drop) or through the move search (3.7), on the board as it will be when the player places it.
- It recurses on the remaining cells and backtracks when stuck. It gives up at the attempt's deadline.

### 3.6 `second_setup` / `try_second_setup`: the second spin

1. `R = after_spin(first)`: the first setup built, its spin piece in the slot, and the full rows cleared. That's the board you'll have after the first spin.
2. The second slot is **dropped** onto `R` like a hard drop at a random column of the well. It rests where it lands, so its spin rows sit on what the first setup left.
3. **`must_open`**: well columns with an empty cell right under the new spin rows. These are the first slot's entry, down to the garbage hole. Such a column must be an *open* column of the second slot, so that after the second spin it is clear all the way down (clean well). A slot that doesn't cover them is rejected.
4. Empty cells outside the well, up to the new spin rows, are filled. A cell with stack under it becomes stack. A cell over a piece of the first build becomes `B` if it is in the spin rows (you build it). If it is below them, this slot position is rejected, because it would leave a hole. Empty well cells in the spin rows become `B`. There are no pockets here: a pocket would float in the middle of the well at the start.
5. `finish_setup` as in 3.4 (without digging a hole). The stack only grows up from stack, never over the first build's pieces.
6. **Starting board**: the first setup's board, plus the second setup's new stack cells moved up by the number of lines the first spin clears. They must fit at row 16 or lower.
7. **`still_works`**: the taller stack must not get in the way of the first setup. Each first-setup piece is placed in order on the real starting board, checking it can be reached, and then the first slot must still be a spin slot.

Each call to `second_setup` tries for up to **500 ms**, with random spin pieces from the options and sizes near `n`.

### 3.7 Reachability: `can_reach`

This is a breadth-first search over the player's real moves from the spawn position (x 4, y 18, flat):

- left, right;
- a **sonic drop** (all the way down; there is no gravity and soft drop is instant, so there are no one-row drops);
- rotate clockwise, counter-clockwise and 180.

It uses the game's own SRS kicks. For 180 it uses the **simple** kick table, which is a subset of TETR.IO's SRS+ table, so every map can be solved with either *180° kicks* setting. The search succeeds when the piece covers exactly the target cells, in any orientation that does.

`is_spin_slot` = the piece fits in the slot, can't move left, right, up or down from it, and `can_reach` finds it. So the only way in is a rotation, and it won't slide or fall afterwards.

### 3.8 Clean well

`is_clean(after_spin(last setup))`: after the last spin, no empty cell of the well has a filled cell above it. This holds by construction:

- the hole goes under an open column (3.4);
- the second spin keeps the first entry open (3.6);
- side-stack cells sit on the stack.

The check stays as a safety net, and maps that fail it are dropped.

### 3.9 The queue

For each spin: the build pieces in placement order (the reverse of `carve`'s removal order), then the spin piece. Each spin's list is shuffled on its own with `get_shuffled_holdable_queue` (`mapgen.js`). That picks an order you can still sort out with **hold** (the hold tables go up to 7 pieces, hence one list per spin), then the lists are joined. At the start, the first piece is put in hold.

---

## 4. Checks every map passes

| Check | Where |
| --- | --- |
| Each spin slot can only be entered by a rotation, and the piece rests there | `is_spin_slot` (3.4, again in 3.6) |
| Every build piece rests on something and can be reached, in placement order | `carve` (3.5) |
| The taller stack of the second setup doesn't block the first one | `still_works` (3.6) |
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
- the saved options are ignored, so the daily map uses the defaults: 2 spins, 5 pieces, no repeated pieces, all spin pieces.

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
| Spawn room | `finish_setup`, `second_setup` | stack at row 16 or lower |
| Time limits | `first_setup` 700 ms per piece, `second_setup` 500 ms, 100 ms per attempt | |
| Attempts per map | `play_a_map` | 10 |

After a change, run the test in section 8.

---

## 7. Known limits

- **Slot shapes**: only flat slots (T: pointing down). No upright S/Z/L/J/I slots, no T-spin triples or minis. So spins are Doubles, and I-spins are Singles.
- **Well widths**:
  - with one spin they range over 3-6, with 3 or 4 wide in about half the maps;
  - with two spins, 3-6 wide, with 3 or 4 wide in about a third of the maps (3-wide is the rarest: the second setup can't use pockets, since they would float in the well).
- **Generation time**: about 0.1-0.2 s per map on a desktop (up to ~0.6 s), more on a phone.
- **At most two spins** per map.

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
    Config.spins = i < 14? 2: 1
    Config.no_of_piece = [4, 5, 6][i % 3]
    play_a_map(); results = []
    const r = solve()
    if (r == 'done' && results.length == 1 && results[0]) out.won++
    else out.failed.push(r + ' ' + Record.spins.map(s => s.piece + s.lines).join())
}
report_result = report
out
```

The last result should be `won: 20` and no `failed` entries. The latest run: 24/24 won, all 24 starting boards clean, and no hole anywhere on the final boards.

---

## 9. Code map (`allspin.js`)

| Function | Role |
| --- | --- |
| `load_gamemode` / `save_gamemode` | Options, from / to the page and localStorage (`allspin_*`) |
| `is_immobile`, `do_harddrop` | Spin detection on each drop, requested-spin bookkeeping, miss messages |
| `play_a_map`, `first_setup`, `second_setup` | Map assembly (3.1, 3.2, 3.6) |
| `slot_shape`, `try_spin_setup`, `try_second_setup` | Slot placement for each spin (3.3, 3.6) |
| `finish_setup` | Caps, hole, bumpy stack, wall height, build shapes (3.4) |
| `terrain_bumps`, `fill_pockets`, `dig` | Bumpy stack, shut-in cells, garbage hole |
| `carve`, `is_even_distributed`, `groups_of_four`, `with_stacks` | Splitting the build into pieces (3.5) |
| `can_reach`, `is_spin_slot`, `still_works` | Reachability and spin checks (3.7, 3.6) |
| `after_spin`, `is_clean`, `clean_start` | Board after a spin; clean well at the end (3.8); clean starting board |
| `play`, `detect_win`, `update_goal`, `spin_name` | Starting a map, judging it, the goal text |
| `show_ans`, `stop_answer` | Show Answer replay |
| `toggle_hint`, `Controls.draw_overlay` | Show Hint: the next slot outlined over the board |

Shared pieces live in `common.js`: result flash and stats, undo, share links, daily seeding and `budget_clock`, rush, finesse, and the touch controls.
