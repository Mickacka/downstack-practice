var game = new Game();
const Keybind = {'keydown':{}, 'keyup':{}}
var Config = {'das':100, 'arr':0, 'delay':0, 'pressing_left':false, 'pressing_right': false, 'pressing_down': false, 'pressing':{},
'skim_ind':false, 'mdhole_ind':false, 'unqiue_ind':true, 'smooth_ind':true, 'auto_next_ind':true,
'spin_pieces':'SZLJIT',
'mode':'allspin', 'no_of_unreserved_piece':6, 'no_of_piece':5,
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
        if (n>=2 && n<=7) Config.no_of_piece = n
    }
    catch(err){}
    document.getElementById('input13').value = Config.no_of_piece
    document.getElementById('input14').checked = Config.skim_ind
    document.getElementById('input16').checked = Config.unqiue_ind
    document.getElementById('input17').checked = Config.smooth_ind
    for (var piece of 'SZLJIT'){
        document.getElementById('spin_'+piece).checked = Config.spin_pieces.includes(piece)
    }
}

function save_gamemode(){
    Config.no_of_piece = parseInt(document.getElementById('input13').value)
    if (! (Config.no_of_piece>=2 && Config.no_of_piece<=7)){
        alert('no of piece should be between 2 to 7')
        Config.no_of_piece = 5
    }
    Config.skim_ind = document.getElementById('input14').checked
    Config.unqiue_ind = document.getElementById('input16').checked
    Config.smooth_ind = document.getElementById('input17').checked
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
function update_keybind(){
    Keybind.keydown = {}
    Keybind.keyup = {}

    Keybind.keydown[Customized_key[0]] = e=>{press_left(true)}
    Keybind.keyup[Customized_key[0]] = e=>{release_left(true)}

    Keybind.keydown[Customized_key[1]] = e=>{press_right(true)}
    Keybind.keyup[Customized_key[1]] = e=>{release_right(true)}

    Keybind.keydown[Customized_key[2]] = e=>{press_down(true)}
    Keybind.keyup[Customized_key[2]] = e=>{release_down(true)}

    add_generic_keybind(Customized_key[3], ()=> do_harddrop())
    add_generic_keybind(Customized_key[4], ()=> game.rotate_anticlockwise())
    add_generic_keybind(Customized_key[5], ()=> game.rotate_clockwise())
    add_generic_keybind(Customized_key[6], ()=> game.rotate_180())
    add_generic_keybind(Customized_key[7], ()=> game.hold())
    add_generic_keybind(Customized_key[8], ()=> retry())
    add_generic_keybind(Customized_key[9], ()=> show_ans())
}

function set_event_listener(){
    document.onkeydown = (e => {
        var func = Keybind.keydown[e.code];
        if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){
            e.preventDefault()}
        if (document.activeElement.className == 'keybind'){
            document.activeElement.value = e.code
            save_setting()
        }
        if (document.activeElement.tagName != 'INPUT' && func != undefined){
            board.focus()
            func()
        }
    })

    document.onkeyup = (e => {
        var func = Keybind.keyup[e.code];
        if (func != undefined){
            func()
        }
    })

    board.onfocus = (e => render())

    board.onblur = (e =>{
        var ctx = document.getElementById("board").getContext('2d');
        ctx.font = "bold 40px Arial ";
        ctx.fillStyle = 'rgba(234,200,0,0.5)'
        ctx.fillText('          OUT OF FOCUS',0,300)
    })

    document.getElementById('input11').oninput = e=>{save_setting()}
    document.getElementById('input12').oninput = e=>{save_setting()}
    document.getElementById('input12.1').onchange = e=>{save_setting()}
    document.getElementById('input13').oninput = e=>{save_gamemode()}
    for (var id of ['input14', 'input16', 'input17', 'spin_S', 'spin_Z', 'spin_L', 'spin_J', 'spin_I', 'spin_T']){
        document.getElementById(id).onchange = e=>{save_gamemode()}
    }
    setup_touch_controls();

    const touch = (id, type, func) => document.getElementById(id).addEventListener(type, e => {func(); render()})
    touch('tc-dr', 'touchstart', () => game.rotate_180())
    touch('tc-h', 'touchstart', () => game.hold())
    touch('tc-hd', 'touchstart', () => do_harddrop())
    touch('tc-l', 'touchstart', () => press_left(true))
    touch('tc-l', 'touchend', () => release_left(true))
    touch('tc-r', 'touchstart', () => press_right(true))
    touch('tc-r', 'touchend', () => release_right(true))
    touch('tc-d', 'touchstart', () => press_down(true))
    touch('tc-d', 'touchend', () => release_down(true))
    touch('tc-cc', 'touchstart', () => game.rotate_anticlockwise())
    touch('tc-c', 'touchstart', () => game.rotate_clockwise())
}

/*
4. map generation
*/
const empty_board = () => Array.from({length: 20}, () => Array(10).fill('N'))

var Record = {
    added_line: [],
    board: [],
    piece_added: [],
    shuffled_queue: ['I','O','J','L','S','Z','T'],
    finished_map: empty_board(),
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

// Breadth-first search over every position the piece can reach from spawn
function reachable_states(test_board, piece){
    var g = new Game()
    g.board = test_board
    g.tetramino = piece
    g.x = 4
    g.y = 18
    g.orientation = 0
    if (g.is_collide()) return new Set()
    var key = () => `${g.x},${g.y},${g.orientation}`
    var seen = new Set([key()])
    var queue = [[g.x, g.y, g.orientation]]
    // the player's moves: there is no gravity and soft drop is instant, so no one-row drops
    var sonic_drop = () => { var y = g.y; g.drop(); return g.y != y }
    var moves = [() => g.move_left(), () => g.move_right(), sonic_drop,
                 () => g.rotate_clockwise(), () => g.rotate_anticlockwise(), () => g.rotate_180()]
    while (queue.length){
        var [x, y, o] = queue.shift()
        for (var move of moves){
            g.x = x; g.y = y; g.orientation = o
            if (move() && !seen.has(key())){
                seen.add(key())
                queue.push([g.x, g.y, g.orientation])
            }
        }
    }
    return seen
}

function try_spin_setup(piece){
    var orientation = random_int(4)
    var shape = shape_table[piece][orientation]
    var xs = shape.map(c => c[0]), ys = shape.map(c => c[1])
    var x = random_int(10 - (Math.max(...xs) - Math.min(...xs))) - Math.min(...xs)
    var y = random_int(2) - Math.min(...ys)
    var cells = piece_cells(piece, orientation, x, y)
    var rows = [...new Set(cells.map(c => c[1]))]
    var bottom = Math.min(...rows), top = Math.max(...rows)
    var is_cell = (col, row) => cells.some(c => c[0] == col && c[1] == row)

    var b = empty_board()
    // below the spin: a clean cheese column
    var cheese_col = random_int(10)
    for (var row=0; row<bottom; row++)
        for (var col=0; col<10; col++)
            if (col != cheese_col) b[row][col] = 'G'
    // the rows the spin clears: full except the piece
    for (var row=bottom; row<=top; row++)
        for (var col=0; col<10; col++)
            if (!is_cell(col, row)) b[row][col] = 'G'
    // above the spin: an uneven surface with overhangs over the slot
    for (var col=0; col<10; col++){
        var height = top + 2 + random_int(3)
        var start = top + 1
        if (cells.some(c => c[0] == col)){
            var roll = Math.random()
            if (roll < 0.45) continue           // open column
            if (roll < 0.75) height = top + 2   // one-block overhang
        }
        for (var row=start; row<height; row++) b[row][col] = 'G'
    }
    // no row above the slot may be full
    for (var row=top+1; row<20; row++)
        if (b[row].every(c => c != 'N')) b[row][random_int(10)] = 'N'

    // the piece must be reachable, and immobile once there (so the last move is a rotation)
    var g = new Game()
    g.board = b
    g.tetramino = piece
    g.x = x; g.y = y; g.orientation = orientation
    if (g.is_collide()) return null
    for (var [dx, dy] of [[-1, 0], [1, 0], [0, 1]]){
        g.x = x+dx; g.y = y+dy
        if (!g.is_collide()) return null
    }
    // the same cells may be reachable under another orientation index (S/Z/I symmetry)
    var target = new Set(cells.map(c => c.join()))
    var reachable = reachable_states(b, piece)
    var found = [...reachable].some(state => {
        var [sx, sy, so] = state.split(',').map(Number)
        var sc = piece_cells(piece, so, sx, sy)
        return sc.every(c => target.has(c.join()))
    })
    if (!found) return null
    return {board: b, lines: top - bottom + 1, cells: cells}
}

function generate_final_map(piece){
    for (var attempt=0; attempt<5000; attempt++){
        var setup = try_spin_setup(piece)
        if (setup){
            game = new Game()
            game.board = setup.board
            Record.spin_piece = piece
            Record.spin_lines = setup.lines
            Record.spin_cells = setup.cells
            Record.added_line = []
            return true
        }
    }
    return false
}

// 4.2 downstack pieces: carved out of the setup and any added garbage lines,
// so the player rebuilds the setup (clearing the garbage) before spinning
function add_line(row_idx){
    for (var i=0; i<10; i++){
        for (var j=19; j>row_idx; j--){
            game.board[j][i] = game.board[j-1][i]
        }
        game.board[row_idx][i] = 'G'
    }
    Record.added_line.push(row_idx)
}

// insert garbage just above the spin setup so the downstack pieces clear lines too
function add_random_line(){
    Record.added_line = []
    var row_index = Record.setup_height + random_int(2)
    var rng = Math.random()
    if (rng<0.1){
        add_line(row_index)
        add_line(row_index+1)
    }
    else if (rng<0.4){
        add_line(row_index)
    }
}

function column_heights(){
    var height = []
    for (var col=0; col<10; col++){
        var h = 0
        for (var row=0; row<20; row++)
            if (game.board[row][col] != 'N') h = row + 1
        height.push(h)
    }
    return height
}

function is_flat_enough(){
    if (!Config.smooth_ind) return true
    var height = column_heights().sort((a, b) => a - b)
    return height[8] - height[1] <= 5
}

// every non-garbage cell must be supported, except inside the spin setup
function has_no_new_holes(){
    for (var col=0; col<10; col++){
        var seen_empty = false
        for (var row=Record.setup_height; row<20; row++){
            if (game.board[row][col] == 'N') seen_empty = true
            else if (seen_empty) return false
        }
    }
    return true
}

function try_a_piece(){
    if (try_drop()){
        var shape = game.to_shape()
        var test = ! is_floatable()
        test = test && Record.added_line.every(val => shape.some(pos => val==pos[1]))
        test = test && (get_unstability() <= Record.base_unstability)
        test = test && (is_exposed() || is_spinable())
        for (var [col, row] of shape){
            game.board[row][col] = "G"
        }
        test = test && has_no_new_holes() && is_flat_enough()
        return test
    }
    return false
}

function is_even_distributed(bag){
    var last_piece = null
    var counter = {I:0, O:0, T:0, J:0, L:0, Z:0, S:0}
    var max = Config.unqiue_ind? 1: 2
    var limit = {I:max, O:max, T:max, J:max, L:max, Z:max, S:max}
    limit[Record.spin_piece] -= 1
    for (var piece of bag){
        counter[piece] += 1
        if (counter[piece] > limit[piece])
            return false
        if (piece == last_piece)
            return false
        last_piece = piece
    }
    return true
}

function try_all_pieces(){
    var bag = shuffle([...'IOTJLZS'])
    for (var piece of bag){
        if (! is_even_distributed(Record.piece_added.concat(piece))) continue
        shuffle(possible_piece_config_table[piece])
        for (var [ori_idx, col_idx] of possible_piece_config_table[piece]){
            game.tetramino = piece
            game.x = col_idx
            game.y = 18
            game.orientation = ori_idx
            if (try_a_piece()){
                Record.piece_added.push(piece)
                return true
            }
        }
    }
    return false
}

function try_a_move(){
    if (Config.skim_ind){
        add_random_line()}
    else{
        Record.added_line = []}
    if (try_all_pieces()){
        game.lock()
        Record.board.push(clone(game.board))
        return true
    }
    return false
}

function generate_a_ds_map(move){
    for (var trial=0; trial<5; trial++){
        if (Date.now() > Record.deadline) return false
        var success = (move == 1)? try_a_move() : (try_a_move() && generate_a_ds_map(move - 1))
        if (success) return true
        Record.board.length = Config.no_of_unreserved_piece-move
        Record.piece_added.length = Config.no_of_unreserved_piece-move
        game.board = clone(Record.board.length > 0? Record.board[Record.board.length-1] : Record.finished_map)
    }
    return false
}

// 4.3 build a map, shuffle the queue and play / restart
function new_setup(piece){
    generate_final_map(piece)
    Record.finished_map = clone(game.board)
    Record.setup_height = Math.max(...column_heights())
    // the spin slot has overhangs by design; only reject maps that add more
    Record.base_unstability = get_unstability()
    game.drawmode = true
    Record.piece_added = []
    Record.board = []
    // a few setups are very hard to fill; give up on them quickly and try another
    Record.deadline = Date.now() + 150
}

function play_a_map(){
    Config.no_of_unreserved_piece = Config.no_of_piece - 1
    // pick the piece once, so pieces with rarer setups (like T) come up as often as the others
    var piece = Config.spin_pieces[random_int(Config.spin_pieces.length)]
    new_setup(piece)
    var success = false
    for (var i=0; i<100 && !success && Config.no_of_unreserved_piece > 0; i++){
        if (generate_a_ds_map(Config.no_of_unreserved_piece) && game.get_max_height() < 17){
            var queue = [...Record.piece_added].reverse()
            queue.push(Record.spin_piece)
            Record.shuffled_queue = get_shuffled_holdable_queue(queue)
            success = Record.shuffled_queue.length > 0
        }
        if (!success) new_setup(piece)
    }
    // fall back to just the spin setup
    if (!success){
        Record.board = [clone(Record.finished_map)]
        Record.shuffled_queue = [Record.spin_piece]
    }
    play()
    game.drawmode = false
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
