// All-Spin exercises from TETR.IO replays: the replay is played back with the tetrp
// engine (vendor/tetrp), placement by placement, and every spin that clears lines
// becomes an exercise: the board a few pieces before it, the pieces the player
// placed (the setup, then the spin piece), and the spin to do.
// No page access here: used by allspin-replays.html and by the tests.
import { parseReplay, prepareReplay, Reconstruction } from './vendor/tetrp/replay/index.js'
import { Engine } from './vendor/tetrp/engine.js'
import { createBag } from './vendor/tetrp/random.js'

const ROWS = 40          // tetrp's board: 20 rows of buffer on top of the 20 visible ones
const MAX_SETUP = 6      // pieces before the spin, at most
const cell_of = c => c === null? 'N': c === 'gb' || c === 'gbd'? 'G': c.toUpperCase()

// tetrp rows count from the top of its 40; ours from the bottom of the 20 visible
const our_row = y => ROWS - 1 - y
function our_board(board){
    var out = []
    for (var r=0; r<20; r++) out.push(board.rows[ROWS - 1 - r].map(cell_of))
    return out
}
const above_visible = board => board.rows.slice(0, ROWS - 20).some(row => row.some(c => c !== null))

// The players of a replay: [{round, player, username}]
export function players_of(text){
    var replay = parseReplay(text)
    var out = []
    for (var round of replay.rounds)
        for (var p of round.players) out.push({round: round.index, player: p.index, username: p.username})
    return {replay: replay, players: out}
}

// Every placement of one player's game, until the engine and the replay's own
// checkpoints disagree (after that the boards can't be trusted):
// {piece, spin ('none', 'mini', 'full'), cells, lines, before (board), garbage_before
// (the board changed by garbage since the last placement), overflow}
export function placements_of(player){
    return placements_of_timeline(prepareReplay(player))
}

/*
Quick Play (TETR.IO's "zenith" mode), which tetrp doesn't cover. The replay has the
player's inputs and notices of garbage sent to them, but no boards, and not how much
garbage reached the board or where its holes were (Quick Play's garbage rules depend
on altitudes, cancel streaks and its own random generator). So:
- the inputs are played on the Tetra League engine (same version 19, 7-bag pieces
  from the seed) with no gravity (this level of play is hard drops and instant soft
  drops): that plays the game right for a long stretch;
- the garbage is found from the game itself: when the board drifts (covered empty
  cells stay above 12 for 10 placements, not counting garbage rows: good players keep
  very few, all-spin overhangs only for a moment), the 50 placements before are tried
  with 1 to 8 garbage rows inserted, each hole column, and the one that keeps the game
  clean longest is kept. Then on to the next drift, until nothing helps.
Garbage rises the way Quick Play lets it in: one row every 5 frames while the next
pieces are played. In the first test (2187 placements) that found 4 rows (hole in
column 5) after placement 342, 5 rows (column 6) after 535 and 8 rows (column 1)
after 654, and the game stays right until about 700 (313 without garbage; 655 with
the rows all put in at once between pieces). Tried and dropped: garbage from the Tetra League
attack rules (it tanks far more than the player took), a 7+1 bag, gravity by floor.
*/
const ZENITH_SUSTAINED = 10, ZENITH_HOLES = 12, ZENITH_WINDOW = 50, ZENITH_STEP = 3
const ZENITH_ROWS = [1, 2, 3, 4, 5, 6, 8]
// Quick Play lets garbage in one row at a time, every 5 frames ("continuous" entry),
// while the next pieces are played: a rising row can push the falling piece up
const ZENITH_GARBAGE_ARE = 5

class ZenithSim {
    constructor(engine, events, frames, cursor, n, queue, locked){
        this.engine = engine; this.events = events; this.frames = frames
        this.cursor = cursor || 0; this.n = n || 0
        this.queue = queue || []; this.locked = locked || 0
        this.rose = 0          // garbage rows risen since the last placement
        this.keep = false      // keep the board just before each lock (for exercises)
        this.board = null
    }
    clone(){
        return new ZenithSim(Engine.restore(this.engine.serialize()), this.events, this.frames, this.cursor, this.n,
            this.queue.slice(), this.locked)
    }
    // let `rows` garbage rows in, hole in column `hole`: they rise from now on
    tank(rows, hole){
        for (var i=0; i<rows; i++) this.queue.push(hole)
        this.locked = Math.max(this.locked, this.engine.state.frame + ZENITH_GARBAGE_ARE)
    }
    // on to the next placement: its lock event and lines cleared, or null at the end
    // (of the replay, or of the rebuilt game: a top-out)
    step(){
        var e = this.engine
        while (true){
            var s = e.state
            if (!s.playing || s.frame >= this.frames) return null
            if (s.phase === 'ready'){
                e.beginFrame([])
                if (this.queue.length && s.frame >= this.locked && !s.piece.sleeping){
                    if (!e.insertGarbage(this.queue.shift())) return null
                    this.locked = s.frame + ZENITH_GARBAGE_ARE
                    this.rose += 1
                }
                if (this.keep) this.board = {rows: s.board.rows.map(row => [...row])}
            }
            var ev = this.events[this.cursor]
            if (ev && ev.frame === s.frame){ e.input(ev); this.cursor++ }
            else e.finishFrame()
            if (!e.trace.length) continue
            var lock = e.trace.find(t => t.type == 'lock'), removed = e.trace.find(t => t.type == 'remove-lines')
            e.trace.length = 0
            if (lock){ this.n++; return {lock: lock, lines: removed? removed.rows.length: 0} }
        }
    }
    at_end(){ return this.engine.state.frame >= this.frames }
}

function zenith_start(data){
    var replay = data.replay, options = replay.options
    var engine = new Engine({mode: 'tl', seed: options.seed, handling: options.handling, rules: {g: 0, gincrease: 0}})
    engine.state.bag = createBag(options.seed)
    engine.spawn()
    engine.trace = []
    var events = replay.events.filter(e => e.type == 'keydown' || e.type == 'keyup')
        .map(e => ({frame: e.frame, type: e.type, key: e.data.key, subframe: e.data.subframe}))
    return new ZenithSim(engine, events, replay.frames)
}

// covered empty cells, not in garbage rows (their hole is there by design)
function covered(rows){
    var n = 0
    for (var c=0; c<10; c++){
        var seen = false
        for (var y=0; y<rows.length; y++){
            if (rows[y][c] !== null) seen = true
            else if (seen && !rows[y].includes('gb')) n++
        }
    }
    return n
}

// play on (letting garbage in as planned) until the board drifts: {at, end}. A top-out
// of the rebuilt game is drift too (the real game went on), from where holes piled up.
function zenith_drift(sim, inserts, max){
    var run = 0, start = null, next = inserts.findIndex(x => x.at >= sim.n)
    if (next < 0) next = inserts.length
    for (var i=0; i<max; i++){
        while (next < inserts.length && inserts[next].at == sim.n){ sim.tank(inserts[next].rows, inserts[next].hole); next++ }
        if (!sim.step()) return {at: run? start: sim.n, end: sim.at_end()}
        if (covered(sim.engine.state.board.rows) > ZENITH_HOLES){
            if (!run) start = sim.n
            if (++run >= ZENITH_SUSTAINED) return {at: start, end: false}
        }
        else run = 0
    }
    return {at: sim.n, end: false}
}

// The garbage the player got, found from the game: [{at (after that placement), rows, hole}]
function infer_garbage(data, progress){
    var start = zenith_start(data), inserts = []
    var drift = zenith_drift(start.clone(), inserts, 100000)
    while (!drift.end){
        if (progress) progress('Finding the garbage: the game is right up to piece ' + drift.at + '…')
        var from = Math.max(0, drift.at - ZENITH_WINDOW)
        // snapshots of the game (with the garbage found so far) from `from`
        var sim = start.clone(), snaps = {}, next = 0
        while (sim.n < drift.at){
            while (next < inserts.length && inserts[next].at == sim.n){ sim.tank(inserts[next].rows, inserts[next].hole); next++ }
            if (sim.n >= from) snaps[sim.n] = sim.clone()
            if (!sim.step()) break
        }
        var best = null
        for (var at = from; at < drift.at; at += ZENITH_STEP){
            if (!snaps[at]) continue
            var later = inserts.filter(x => x.at > at)
            for (var rows of ZENITH_ROWS) for (var hole=0; hole<10; hole++){
                var trial = snaps[at].clone()
                trial.tank(rows, hole)
                var res = zenith_drift(trial, later, 400)
                if (!best || res.at > best.res.at) best = {at: at, rows: rows, hole: hole, res: res}
            }
        }
        // nothing helps enough: the game can't be followed further
        if (!best || best.res.at < drift.at + 15) break
        inserts.push({at: best.at, rows: best.rows, hole: best.hole})
        inserts.sort((a, b) => a.at - b.at)
        drift = zenith_drift(start.clone(), inserts, 100000)
    }
    return {inserts: inserts, drift: drift}
}

// The placements of a Quick Play game with the garbage found, up to `until`. The
// board before each placement is the one just before it locks (garbage may have risen
// while it moved).
function zenith_placements(data, inserts, until){
    var sim = zenith_start(data), out = [], next = 0
    sim.keep = true
    sim.rose = 1   // (the first placement starts a stretch)
    while (sim.n < until){
        while (next < inserts.length && inserts[next].at == sim.n){ sim.tank(inserts[next].rows, inserts[next].hole); next++ }
        var step = sim.step()
        if (!step) break
        var t = step.lock, before = sim.board
        out.push({
            index: t.placementIndex,
            piece: t.piece.toUpperCase(),
            spin: t.spin,
            cells: t.cells.map(([x, y]) => [x, our_row(y)]),
            lines: step.lines,
            before: our_board(before),
            overflow: above_visible(before) || t.cells.some(([x, y]) => our_row(y) > 19),
            garbage_before: sim.rose > 0,
            frame: t.frame,
        })
        sim.rose = 0
    }
    return out
}

// `stop_holes`: stop when the board has more covered empty cells than that (a sign
// that it has drifted from the real game: good players keep very few)
function placements_of_timeline(timeline, stop_holes){
    var rec = new Reconstruction(timeline)
    var out = [], last = rec.engine.state.board, changed = false
    var snapshot = board => ({rows: board.rows.map(row => [...row])})
    last = snapshot(last)
    var stopped = false
    while (rec.advance()){
        var first_bad = rec.diagnostics.first
        if (first_bad) break
        if (!rec.engine.state.playing){ stopped = true; break }
        if (stop_holes){
            // covered empty cells (an empty cell with a filled one somewhere above it)
            var rows = rec.engine.state.board.rows, covered = 0
            for (var c=0; c<10; c++){
                var seen = false
                for (var y=0; y<ROWS; y++){ if (rows[y][c] !== null) seen = true; else if (seen) covered++ }
            }
            if (covered > stop_holes){ stopped = true; break }
        }
        var locks = rec.transitions.filter(t => t.type == 'lock')
        var now = rec.engine.state.board
        if (locks.length == 0){
            if (JSON.stringify(now.rows) != JSON.stringify(last.rows)) changed = true
            last = snapshot(now)
            continue
        }
        for (var t of rec.transitions){
            if (t.type != 'lock') continue
            var removed = rec.transitions.find(x => x.type == 'remove-lines')
            out.push({
                index: t.placementIndex,
                piece: t.piece.toUpperCase(),
                spin: t.spin,
                cells: t.cells.map(([x, y]) => [x, our_row(y)]),
                lines: removed? removed.rows.length: 0,
                before: our_board(last),
                overflow: above_visible(last) || t.cells.some(([x, y]) => our_row(y) > 19),
                garbage_before: changed,
                frame: t.frame,
            })
            changed = false
        }
        // garbage taken right after this placement shows up before the next one: the
        // board isn't just the last one with the piece placed and the full rows cleared
        var expected = snapshot(last)
        for (var t of locks) for (var [x, y] of t.cells) expected.rows[y][x] = t.piece
        expected.rows = expected.rows.filter(row => row.some(c => c === null) || row.every(c => c === 'gbd'))
        while (expected.rows.length < ROWS) expected.rows.unshift(Array(10).fill(null))
        if (JSON.stringify(expected.rows) != JSON.stringify(now.rows)) changed = true
        last = snapshot(now)
    }
    return {placements: out, diverged: !!rec.diagnostics.first || stopped, frames: timeline.frames}
}

// stuck left, right and up (the all-spin rule of the practice page)
function immobile(board, cells){
    var filled = (c, r) => c < 0 || c > 9 || r < 0 || (r < 20 && board[r][c] != 'N')
    return [[-1, 0], [1, 0], [0, 1]].every(([dx, dy]) => cells.some(([c, r]) => filled(c + dx, r + dy)))
}

// The exercises in a list of placements. One starts with a spin clearing lines that
// has 1 to MAX_SETUP pieces before it since the last line clear or garbage. Spins
// that follow close behind (at most MAX_SETUP pieces later, with no other line clear
// and no garbage in between) are merged into it, up to MAX_SPINS: the pieces placed
// after a spin are on the board that spin left, as in the practice page's chains.
// Every spin must be one by the practice page's rule too, with nothing above the
// visible board.
const MAX_SPINS = 4
export function exercises_from(placements, source){
    var out = []
    // a spin clearing lines that this page counts, on the board just before it
    var spin_at = i => {
        var p = placements[i]
        return p.spin != 'none' && p.lines > 0 && !p.overflow && immobile(p.before, p.cells)
    }
    for (var i=0; i<placements.length; i++){
        if (!spin_at(i)) continue
        var first = i
        while (first > 0 && i - first < MAX_SETUP){
            var q = placements[first - 1]
            if (q.lines > 0 || q.overflow || placements[first].garbage_before) break
            first -= 1
        }
        if (first == i) continue
        // the spins that follow close behind: the next placement that clears lines (or
        // brings garbage, or goes too high) within MAX_SETUP pieces must be a spin,
        // with no garbage before it
        var chain = [i]
        while (chain.length < MAX_SPINS){
            var last = chain[chain.length - 1], next = -1
            for (var k=last+1; k<placements.length && k<=last+1+MAX_SETUP; k++)
                if (placements[k].lines > 0 || placements[k].garbage_before || placements[k].overflow){ next = k; break }
            if (next < 0 || placements[next].garbage_before || !spin_at(next)) break
            chain.push(next)
        }
        var start = first
        var spins = chain.map(c => {
            var setup = placements.slice(start, c), p = placements[c]
            start = c + 1
            return {piece: p.piece, lines: p.lines, cells: p.cells, kind: p.spin,
                // placement order reversed, as the generator's builds are
                build: setup.map(q => ({piece: q.piece, cells: q.cells})).reverse()}
        })
        out.push({
            board: placements[first].before.map(row => row.join('')),
            queue: placements.slice(first, chain[chain.length-1] + 1).map(q => q.piece),
            spins: spins,
            // first/last: where the exercise starts and ends in the round's timeline
            // seconds: how long the player took, from the placement before the first
            // setup piece (when it spawned, about) to the last spin (60 frames a second)
            source: Object.assign({placement: placements[i].index, frame: placements[i].frame,
                first: first, last: chain[chain.length-1],
                seconds: Math.round((placements[chain[chain.length-1]].frame - (first > 0? placements[first-1].frame: 0)) / 6) / 10}, source),
        })
        // the spins merged in aren't exercises of their own
        i = chain[chain.length - 1]
    }
    return out
}

// The round in a compact form, to play the player's game between two exercises on
// the practice page: [{p: piece, c: cells, k: the board before it}], with the board
// only where it can't be worked out from the placement before (the first one, after
// garbage, or after something above the visible board)
export function timeline_of(placements){
    return placements.map((q, i) => {
        var item = {p: q.piece, c: q.cells}
        if (i == 0 || q.garbage_before || placements[i-1].overflow || q.overflow) item.k = q.before.map(row => row.join(''))
        return item
    })
}

// Everything at once, for one replay file: [{username, round, exercises, timeline,
// placements, diverged, error}] per player
export function exercises_of_replay(text, file, progress){
    var data = null
    try{ data = JSON.parse(text) }catch(err){}
    if (data && data.gamemode == 'zenith' && data.replay && data.replay.options){
        var username = (data.users && data.users[0] && data.users[0].username) || data.replay.options.username || 'player'
        try{
            // (up to where it drifts, less 15 placements, where it started)
            var {inserts, drift} = infer_garbage(data, progress)
            var placements = zenith_placements(data, inserts, drift.end? Infinity: Math.max(0, drift.at - 15))
            var diverged = !drift.end
            var exercises = exercises_from(placements, {file: file, username: username, round: 0, mode: 'zenith'})
            return [{username: username, round: 0, placements: placements.length, diverged: diverged, mode: 'zenith',
                exercises: exercises, timeline: exercises.length? timeline_of(placements): null}]
        }
        catch(err){
            return [{username: username, round: 0, placements: 0, exercises: [], error: err.message}]
        }
    }
    var {replay, players} = players_of(text)
    return players.map(who => {
        var player = replay.rounds[who.round].players[who.player]
        try{
            var {placements, diverged} = placements_of(player)
            var source = {file: file, username: who.username, round: who.round}
            var exercises = exercises_from(placements, source)
            return {username: who.username, round: who.round, placements: placements.length, diverged: diverged,
                exercises: exercises, timeline: exercises.length? timeline_of(placements): null}
        }
        catch(err){
            return {username: who.username, round: who.round, placements: 0, exercises: [], error: err.message}
        }
    })
}
