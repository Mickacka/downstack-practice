// All-Spin exercises from TETR.IO replays: the replay is played back with the tetrp
// engine (vendor/tetrp), placement by placement, and every spin that clears lines
// becomes an exercise: the board a few pieces before it, the pieces the player
// placed (the setup, then the spin piece), and the spin to do.
// No page access here: used by allspin-replays.html and by the tests.
import { parseReplay, prepareReplay, Reconstruction } from './vendor/tetrp/replay/index.js'

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
    var timeline = prepareReplay(player)
    var rec = new Reconstruction(timeline)
    var out = [], last = rec.engine.state.board, changed = false
    var snapshot = board => ({rows: board.rows.map(row => [...row])})
    last = snapshot(last)
    while (rec.advance()){
        var first_bad = rec.diagnostics.first
        if (first_bad) break
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
    return {placements: out, diverged: !!rec.diagnostics.first, frames: timeline.frames}
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
            source: Object.assign({placement: placements[i].index, frame: placements[i].frame}, source),
        })
        // the spins merged in aren't exercises of their own
        i = chain[chain.length - 1]
    }
    return out
}

// Everything at once, for one replay file: [{username, round, exercises, placements,
// diverged, error}] per player
export function exercises_of_replay(text, file){
    var {replay, players} = players_of(text)
    return players.map(who => {
        var player = replay.rounds[who.round].players[who.player]
        try{
            var {placements, diverged} = placements_of(player)
            var source = {file: file, username: who.username, round: who.round}
            return {username: who.username, round: who.round, placements: placements.length, diverged: diverged,
                exercises: exercises_from(placements, source)}
        }
        catch(err){
            return {username: who.username, round: who.round, placements: 0, exercises: [], error: err.message}
        }
    })
}
