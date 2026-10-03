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

// The exercises in a list of placements: each spin clearing lines with 1 to
// MAX_SETUP pieces before it since the last line clear or garbage, nothing above the
// visible board, and a spin by the practice page's rule too.
export function exercises_from(placements, source){
    var out = []
    placements.forEach((p, i) => {
        if (p.spin == 'none' || p.lines == 0 || p.overflow) return
        var first = i
        while (first > 0 && i - first < MAX_SETUP){
            var q = placements[first - 1]
            if (q.lines > 0 || q.overflow || placements[first].garbage_before) break
            first -= 1
        }
        if (first == i) return
        // the board just before the spin: the start plus the setup
        var board = placements[first].before.map(row => [...row])
        for (var k=first; k<i; k++) for (var [c, r] of placements[k].cells) board[r][c] = placements[k].piece
        if (!immobile(board, p.cells)) return
        var setup = placements.slice(first, i)
        out.push({
            board: placements[first].before.map(row => row.join('')),
            queue: setup.map(q => q.piece).concat([p.piece]),
            spin: {piece: p.piece, lines: p.lines, cells: p.cells, kind: p.spin,
                // placement order reversed, as the generator's builds are
                build: setup.map(q => ({piece: q.piece, cells: q.cells})).reverse()},
            source: Object.assign({placement: p.index, frame: p.frame}, source),
        })
    })
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
