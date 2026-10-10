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

// Quick Play (TETR.IO's "zenith" mode), which tetrp doesn't cover: the player's
// inputs on the Tetra League engine (same version, 7-bag pieces from the seed), with
// no gravity (this level of play is hard drops and instant soft drops) and no
// garbage. That plays the game right for a long stretch (in the first test, a
// 72-spin B2B chain, as in the replay); the garbage the player gets is missing, so
// once they dig into it the boards drift and the stack grows: reading stops when it
// starts to pile up holes (`stop_holes`). There are no checkpoints in these replays;
// tried and dropped: Zenith garbage on the Tetra League attack rules (it tanks far
// more than the player really took), switching to a 7+1 bag, and gravity (no change).
function zenith_timeline(data){
    var replay = data.replay, options = replay.options
    var engine = new Engine({mode: 'tl', seed: options.seed, handling: options.handling, rules: {g: 0, gincrease: 0}})
    engine.state.bag = createBag(options.seed)
    engine.spawn()
    engine.trace = []
    var events = replay.events.filter(e => e.type == 'keydown' || e.type == 'keyup')
        .map(e => ({frame: e.frame, type: e.type, key: e.data.key, subframe: e.data.subframe}))
    events.push({frame: replay.frames, type: 'terminal', reason: 'end'})
    return {schema: 'tetrp-timeline/1', id: 'zenith-' + (data.id || options.seed), frames: replay.frames,
        profile: 'zenith-no-garbage', options: options, initial: engine.serialize(), events: events}
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
export function exercises_of_replay(text, file){
    var data = null
    try{ data = JSON.parse(text) }catch(err){}
    if (data && data.gamemode == 'zenith' && data.replay && data.replay.options){
        var username = (data.users && data.users[0] && data.users[0].username) || data.replay.options.username || 'player'
        try{
            // (the board drifts once the missing garbage matters: stop when holes pile
            // up, and leave out the last 15 placements before that, where it started)
            var {placements, diverged} = placements_of_timeline(zenith_timeline(data), 10)
            if (diverged) placements = placements.slice(0, Math.max(0, placements.length - 15))
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
