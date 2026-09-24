var game = new Game();
const Keybind = {'keydown':{}, 'keyup':{}}
var Config = {'das':100, 'arr':0, 'delay':0, 'pressing_left':false, 'pressing_right': false, 'pressing_down': false, 'pressing':{},
'unqiue_ind':true, 'auto_next_ind':true,
'spin_pieces':'SZLJIT',
'mode':'allspin', 'no_of_piece':5,
'no_of_trial':0, 'no_of_success':0}
var Customized_key = ['ArrowLeft','ArrowRight','ArrowDown','Space','KeyZ','KeyX','KeyA','ShiftLeft','KeyR','KeyP']
var board = document.getElementById('board')

const clone = (items) => items.map(item => Array.isArray(item) ? clone(item) : item);

const sound={
    0:new Audio ("sound/1.ogg"),
    1:new Audio ("sound/2.ogg"),
    2:new Audio ("sound/3.ogg"),
    3:new Audio ("sound/4.ogg"),
    4:new Audio ("sound/5.ogg"),
    5:new Audio ("sound/6.ogg"),
    6:new Audio ("sound/7.ogg"),
    win:new Audio ("sound/win.ogg"),
    lose:new Audio ("sound/lose.ogg")
}

const LINE_NAMES = ['', 'Single', 'Double', 'Triple', 'Quad']

/*
1. html related
*/
function load_gamemode(){
    try{
        var pieces = localStorage.getItem('allspin_pieces')
        if (pieces) Config.spin_pieces = pieces
        var n = parseInt(localStorage.getItem('allspin_no_of_piece'))
        if (n>=3 && n<=7) Config.no_of_piece = n
    }
    catch(err){}
    document.getElementById('input13').value = Config.no_of_piece
    document.getElementById('input16').checked = Config.unqiue_ind
    for (var piece of 'SZLJIT'){
        document.getElementById('spin_'+piece).checked = Config.spin_pieces.includes(piece)
    }
}

function save_gamemode(){
    Config.no_of_piece = parseInt(document.getElementById('input13').value)
    if (! (Config.no_of_piece>=3 && Config.no_of_piece<=7)){
        alert('no of piece should be between 3 to 7')
        Config.no_of_piece = 5
    }
    Config.unqiue_ind = document.getElementById('input16').checked
    var pieces = [...'SZLJIT'].filter(piece => document.getElementById('spin_'+piece).checked).join('')
    if (pieces == ''){
        alert('Choose at least one spin piece')
        pieces = 'SZLJIT'
        for (var piece of pieces) document.getElementById('spin_'+piece).checked = true
    }
    Config.spin_pieces = pieces
    try{
        localStorage.setItem('allspin_pieces', Config.spin_pieces)
        localStorage.setItem('allspin_no_of_piece', Config.no_of_piece)
    }
    catch(err){}
}

/*
2. spin detection (all-spin rule: after the last rotation the piece cannot move left, right or up)
*/
function is_immobile(){
    for (var [dx, dy] of [[-1, 0], [1, 0], [0, 1]]){
        game.x += dx
        game.y += dy
        var collide = game.is_collide()
        game.x -= dx
        game.y -= dy
        if (!collide) return false
    }
    return true
}

function do_harddrop(){
    game.drop()
    var piece = game.tetramino
    var spin = /^[za]/.test(game.lastmove) && is_immobile()
    game.harddrop()
    if (spin && game.line_clear > 0){
        show_spin_message(`${piece}-Spin ${LINE_NAMES[game.line_clear]}!`)
        if (piece == Record.spin_piece) Record.done_spin = true
    }
    play_sound()
    detect_win()
}

function show_spin_message(text){
    var msg = document.getElementById('spin_message')
    msg.textContent = text
    msg.classList.remove('flash')
    void msg.offsetWidth
    msg.classList.add('flash')
}

/*
3. keybind
*/

Controls.harddrop = () => do_harddrop()
Controls.bind_options = () => {
    document.getElementById('input13').oninput = e=>{save_gamemode()}
    for (var id of ['input16', 'spin_S', 'spin_Z', 'spin_L', 'spin_J', 'spin_I', 'spin_T']){
        document.getElementById(id).onchange = e=>{save_gamemode()}
    }
}

/*
4. map generation
*/
const empty_board = () => Array.from({length: 20}, () => Array(10).fill('N'))

var Record = {
    board: [],
    shuffled_queue: ['I','O','J','L','S','Z','T'],
    spin_piece: 'T',
    spin_lines: 2,
    done_spin: false,
}

// 4.1 the spin setup: a slot that the spin piece can only reach by rotating into it
function random_int(n){
    return Math.floor(Math.random()*n)
}

function piece_cells(piece, orientation, x, y){
    return shape_table[piece][orientation].map(([dx, dy]) => [x+dx, y+dy])
}

// Can the piece, starting from spawn, end up covering exactly these cells?
// Breadth-first search over the player's moves, stopping as soon as it gets there.
function can_reach(test_board, piece, target){
    var want = target.map(c => c.join()).sort().join("|")
    var state_id = (x, y, o) => ((y + 4) * 16 + (x + 3)) * 4 + o
    // every (x, y, orientation) whose cells are the target
    var goals = new Set()
    for (var o=0; o<4; o++)
        for (var [dx, dy] of shape_table[piece][o])
            for (var [tx, ty] of target){
                var cells = piece_cells(piece, o, tx - dx, ty - dy)
                if (cells.map(c => c.join()).sort().join("|") == want) goals.add(state_id(tx - dx, ty - dy, o))
            }
    var g = new Game()
    g.board = test_board
    g.tetramino = piece
    g.x = 4
    g.y = 18
    g.orientation = 0
    if (g.is_collide()) return false
    var seen = new Uint8Array(30 * 16 * 4)
    seen[state_id(g.x, g.y, 0)] = 1
    var queue = [[g.x, g.y, 0]]
    // the player's moves: there is no gravity and soft drop is instant, so no one-row drops
    var sonic_drop = () => { var y = g.y; g.drop(); return g.y != y }
    var moves = [() => g.move_left(), () => g.move_right(), sonic_drop,
                 () => g.rotate_clockwise(), () => g.rotate_anticlockwise(), () => g.rotate_180()]
    for (var head=0; head<queue.length; head++){
        var [x, y, o] = queue[head]
        for (var move of moves){
            g.x = x; g.y = y; g.orientation = o
            if (!move()) continue
            var id = state_id(g.x, g.y, g.orientation)
            if (seen[id]) continue
            if (goals.has(id)) return true
            seen[id] = 1
            queue.push([g.x, g.y, g.orientation])
        }
    }
    return false
}

// The player sees a flat garbage floor. The spin rows are garbage except a
// "build area" around the slot; the player fills that area and builds the
// overhang, which reveals the slot, then spins into it.
const cell_key = (col, row) => col + ',' + row

function is_even_distributed(bag){
    var counter = {I:0, O:0, T:0, J:0, L:0, Z:0, S:0}
    var max = Config.unqiue_ind? 1: 2
    var limit = {I:max, O:max, T:max, J:max, L:max, Z:max, S:max}
    limit[Record.spin_piece] -= 1
    for (var piece of bag){
        counter[piece] += 1
        if (counter[piece] > limit[piece]) return false
    }
    return true
}

// Split the build cells into tetrominoes, removing the top pieces first
// (so the player places them last). Each piece must rest on something and be
// reachable on the board the player has at that moment.
function carve(b, cells, used){
    if (cells.size == 0) return []
    if (Date.now() > Record.deadline) return null
    // the highest (then leftmost) cell must belong to the next piece removed
    var target = null
    for (var key of cells){
        var [c, r] = key.split(',').map(Number)
        if (!target || r > target[1] || (r == target[1] && c < target[0])) target = [c, r]
    }
    var tried = new Set()
    for (var piece of shuffle([...'IOTJLSZ'])){
        if (!is_even_distributed(used.concat(piece))) continue
        for (var o of shuffle([0, 1, 2, 3])){
            for (var [dx, dy] of shape_table[piece][o]){
                var x = target[0] - dx, y = target[1] - dy
                var pc = piece_cells(piece, o, x, y)
                if (!pc.every(([col, row]) => cells.has(cell_key(col, row)))) continue
                var id = piece + pc.map(c => c.join()).sort().join('|')
                if (tried.has(id)) continue
                tried.add(id)
                for (var [col, row] of pc) b[row][col] = 'N'
                // resting: something directly below one of its cells
                var rests = pc.some(([col, row]) => row == 0 || (b[row-1][col] != 'N' && !pc.some(p => p[0] == col && p[1] == row-1)))
                if (rests){
                    // nothing above it: a straight hard drop reaches it; otherwise search
                    var open_above = pc.every(([col, row]) => {
                        for (var r=row+1; r<20; r++)
                            if (b[r][col] != 'N' && !pc.some(p => p[0] == col && p[1] == r)) return false
                        return true
                    })
                    var here = open_above || can_reach(b, piece, pc)
                    if (here){
                        for (var [col, row] of pc) cells.delete(cell_key(col, row))
                        var rest = carve(b, cells, used.concat(piece))
                        if (rest) return [{piece: piece, cells: pc}].concat(rest)
                        for (var [col, row] of pc) cells.add(cell_key(col, row))
                    }
                }
                for (var [col, row] of pc) b[row][col] = 'B'
            }
        }
    }
    return null
}

function try_spin_setup(piece, n_build){
    // only flat slots ever work out (and for T, only pointing down: the T-spin double shape)
    var orientation = piece == 'T'? 2: 2 * random_int(2)
    var shape = shape_table[piece][orientation]
    var xs = shape.map(c => c[0]), ys = shape.map(c => c[1])
    var floor = random_int(3)
    var x = random_int(10 - (Math.max(...xs) - Math.min(...xs))) - Math.min(...xs)
    var y = floor - Math.min(...ys)
    var slot = piece_cells(piece, orientation, x, y)
    var slot_cols = slot.map(c => c[0])
    var bottom = floor, top = Math.max(...slot.map(c => c[1]))
    var is_slot = (col, row) => slot.some(c => c[0] == col && c[1] == row)

    // build area: the slot's columns plus a margin of 1-3 on each side (cells
    // under the slot's edges would otherwise be cut off and impossible to fill)
    var left = Math.max(0, Math.min(...slot_cols) - 1 - random_int(3))
    var right = Math.min(9, Math.max(...slot_cols) + 1 + random_int(3))

    var b = empty_board()
    var cheese_col = random_int(10)
    for (var row=0; row<bottom; row++)
        for (var col=0; col<10; col++)
            if (col != cheese_col) b[row][col] = 'G'
    for (var row=bottom; row<=top; row++)
        for (var col=0; col<10; col++)
            if (!is_slot(col, row)) b[row][col] = (col >= left && col <= right)? 'B': 'G'

    // over the slot: cap some columns (the overhang) and leave the rest open as the way in
    // Try every choice of capped columns (at most 16) and keep one where the slot is
    // reachable, and only by a final rotation.
    var slot_col_set = [...new Set(slot_cols)]
    var valid = []
    for (var mask=0; mask < (1 << slot_col_set.length); mask++){
        var h = Array(10).fill(0)
        slot_col_set.forEach((col, i) => { if (mask & (1 << i)) h[col] = 1 + random_int(2) })
        if (is_spin_slot(with_stacks(b, h, top), piece, orientation, x, y, slot)) valid.push(h)
    }
    if (valid.length == 0) return null
    var heights = valid[random_int(valid.length)]

    // beside the slot: random stacks, sized so the build takes exactly n_build pieces.
    // A good slot is rare, so try several stacks around the same one.
    var side_cols = []
    for (var col=Math.max(0, left-1); col<=Math.min(9, right+1); col++)
        if (!slot_cols.includes(col)) side_cols.push(col)
    if (side_cols.length == 0) return null
    var spin_row_cells = b.flat().filter(c => c == 'B').length
    for (var attempt=0; attempt<12; attempt++){
        var h = [...heights]
        for (var col of side_cols) h[col] = random_int(3)
        var count = () => spin_row_cells + h.reduce((a, v) => a + v, 0)
        for (var i=0; i<40 && count() != 4*n_build; i++){
            var col = side_cols[random_int(side_cols.length)]
            if (count() < 4*n_build && h[col] < 4) h[col] += 1
            else if (count() > 4*n_build && h[col] > 0) h[col] -= 1
        }
        if (count() != 4*n_build) continue
        var nb = with_stacks(b, h, top)
        if (nb.slice(top+1).some(row => row.every(c => c != 'N'))) continue
        // the stacks beside the slot can block the way in
        if (!is_spin_slot(nb, piece, orientation, x, y, slot)) continue

        // split the build into pieces the player can place in order
        var cells = new Set()
        for (var row=0; row<20; row++)
            for (var col=0; col<10; col++)
                if (nb[row][col] == 'B') cells.add(cell_key(col, row))
        if (!groups_of_four(cells)) continue
        var finished = clone(nb)
        var build = carve(nb, cells, [])
        if (!build){
            if (Date.now() > Record.deadline) return null
            continue
        }
        // the finished board with each piece in its own colour, for Show Answer
        for (var {piece: p, cells: pc} of build)
            for (var [col, row] of pc) finished[row][col] = p
        return {board: finished, lines: top - bottom + 1, cells: slot, build: build}
    }
    return null
}

// Tetrominoes can only tile a group of touching cells whose size is a multiple of 4
function groups_of_four(cells){
    var seen = new Set()
    for (var start of cells){
        if (seen.has(start)) continue
        var size = 0, stack = [start]
        seen.add(start)
        while (stack.length){
            var [c, r] = stack.pop().split(',').map(Number)
            size += 1
            for (var [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
                var k = cell_key(c+dc, r+dr)
                if (cells.has(k) && !seen.has(k)){ seen.add(k); stack.push(k) }
            }
        }
        if (size % 4) return false
    }
    return true
}

function with_stacks(b, heights, top){
    var nb = clone(b)
    for (var col=0; col<10; col++)
        for (var row=top+1; row<=top+heights[col]; row++) nb[row][col] = 'B'
    return nb
}

function is_spin_slot(b, piece, orientation, x, y, slot){
    var g = new Game()
    g.board = b
    g.tetramino = piece
    g.x = x; g.y = y; g.orientation = orientation
    if (g.is_collide()) return false
    for (var [dx, dy] of [[-1, 0], [1, 0], [0, 1]]){
        g.x = x+dx; g.y = y+dy
        if (!g.is_collide()) return false
    }
    return can_reach(b, piece, slot)
}

// 4.2 build a map, shuffle the queue and play / restart
function play_a_map(){
    var n_build = Config.no_of_piece - 1
    // pick the spin piece first (not per attempt), so rarer setups like T come up as often
    var pieces = shuffle([...Config.spin_pieces])
    var setup = null
    // Some piece/size combinations are rare or impossible (a T-spin double can't be
    // built from 2 pieces), so fall back to a nearby size, then to another piece.
    for (var piece of pieces){
        Record.spin_piece = piece
        // a T-spin double needs at least 3 pieces around it
        var min_build = piece == 'T'? 3: 2
        var sizes = [n_build, n_build+1, n_build-1, n_build+2].filter(n => n >= min_build && n <= 6)
        for (var i=0; i<sizes.length && !setup; i++){
            var give_up = Date.now() + (i == 0? 1200: 600)
            while (!setup && Date.now() < give_up){
                Record.deadline = Date.now() + 100
                setup = try_spin_setup(piece, sizes[i])
            }
        }
        if (setup) break
    }
    // last resort: an S or Z spin almost always generates quickly
    while (!setup){
        Record.spin_piece = 'SZ'[random_int(2)]
        Record.deadline = Date.now() + 100
        setup = try_spin_setup(Record.spin_piece, 3)
    }
    Record.spin_lines = setup.lines
    Record.spin_cells = setup.cells
    Record.board = [setup.board]
    Record.build = setup.build
    // build pieces go in the reverse of the order they were carved out
    var queue = setup.build.map(p => p.piece).reverse()
    queue.push(Record.spin_piece)
    Record.shuffled_queue = get_shuffled_holdable_queue(queue)
    if (Record.shuffled_queue.length == 0) Record.shuffled_queue = queue

    play()
    document.getElementById('winning_requirement1').innerHTML =
        `Do ${"SLI".includes(Record.spin_piece)? "an": "a"} ${Record.spin_piece}-Spin ${LINE_NAMES[Record.spin_lines]}`
    document.getElementById('spin_message').textContent = ''
    render()
}

function play(){
    game = new Game()
    Record.done_spin = false
    game.bag = Record.shuffled_queue.concat(Array(14).fill('G'))
    game.update()
    game.holdmino = ''
    game.hold()
    // a one-piece queue would otherwise start with the piece stuck in hold
    if (game.tetramino == 'G') game.hold()
    if (Record.board.length > 0){
        game.board = clone(Record.board[Record.board.length-1])
        for (var row_idx=0; row_idx<20; row_idx++)
            for (var col_idx=0; col_idx<10; col_idx++)
                if (game.board[row_idx][col_idx] != 'G')
                    game.board[row_idx][col_idx] = 'N'
    }
}

function detect_win(){
    if (game.total_piece == 1){
        Config.no_of_trial += 1}
    if (game.total_piece == Record.shuffled_queue.length){
        if (Record.done_spin){
            sound['win'].play()
            Config.no_of_success += 1
            if (Config.auto_next_ind) play_a_map()
        }
        else{
            sound['lose'].play()
            retry()
        }
    }
}

// shows where every piece goes, including the spin piece in its slot
function show_ans(){
    game.board = clone(Record.board[Record.board.length-1])
    for (var [col, row] of Record.spin_cells) game.board[row][col] = Record.spin_piece
    render()
    setTimeout(retry, 3000)
}

/*
5. start
*/
set_event_listener()
load_setting()
load_gamemode()
update_keybind()
board.focus()
play_a_map()
render()
