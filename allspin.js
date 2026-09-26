var game = new Game();
var Config = {'das':100, 'arr':0, 'delay':0, 'pressing_left':false, 'pressing_right': false, 'pressing_down': false, 'pressing':{},
'unqiue_ind':true, 'auto_next_ind':true,
'spin_pieces':'SZLJIT',
'mode':'allspin', 'no_of_piece':5, 'spins':2, 'continuous':false, 'answer_inputs':false, 'find_slot':false, 'review':true, 'focus_weak':false, 'preview':5, 'clears':'double',
'no_of_trial':0, 'no_of_success':0}



const LINE_NAMES = ['', 'Single', 'Double', 'Triple', 'Quad']

/*
1. html related
*/
function load_gamemode(){
    // the daily map uses the default options
    if (!Daily.on) try{
        var pieces = localStorage.getItem('allspin_pieces')
        if (pieces) Config.spin_pieces = pieces
        var n = parseInt(localStorage.getItem('allspin_no_of_piece'))
        if (n>=3 && n<=7) Config.no_of_piece = n
        var spins = parseInt(localStorage.getItem('allspin_spins'))
        if (spins >= 1 && spins <= 4) Config.spins = spins
        Config.continuous = localStorage.getItem('allspin_continuous') == 'on'
        Config.answer_inputs = localStorage.getItem('allspin_answer_inputs') == 'on'
        Config.find_slot = localStorage.getItem('allspin_find_slot') == 'on'
        Config.review = localStorage.getItem('allspin_review') != 'off'
        Config.focus_weak = localStorage.getItem('allspin_focus_weak') == 'on'
        var clears = localStorage.getItem('allspin_clears')
        if (['double', 'single', 'mix'].includes(clears)) Config.clears = clears
        var preview = parseInt(localStorage.getItem('allspin_preview'))
        if (preview >= 1 && preview <= 5) Config.preview = preview
    }
    catch(err){}
    document.getElementById('input13').value = Config.no_of_piece
    document.getElementById('spins').value = Config.spins
    document.getElementById('continuous').checked = Config.continuous
    document.getElementById('answer_inputs').checked = Config.answer_inputs
    document.getElementById('find_slot').checked = Config.find_slot
    document.getElementById('review').checked = Config.review
    document.getElementById('focus_weak').checked = Config.focus_weak
    document.getElementById('preview').value = Config.preview
    document.getElementById('clears').value = Config.clears
    Controls.preview = Config.preview
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
    Config.spins = Math.max(1, Math.min(4, parseInt(document.getElementById('spins').value) || 2))
    Config.continuous = document.getElementById('continuous').checked
    Config.answer_inputs = document.getElementById('answer_inputs').checked
    Config.find_slot = document.getElementById('find_slot').checked
    Config.review = document.getElementById('review').checked
    Config.focus_weak = document.getElementById('focus_weak').checked
    Config.preview = parseInt(document.getElementById('preview').value) || 5
    Config.clears = document.getElementById('clears').value
    Controls.preview = Config.preview
    render()
    if (Record.spins.length) update_goal()
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
        localStorage.setItem('allspin_spins', Config.spins)
        localStorage.setItem('allspin_continuous', Config.continuous? 'on': 'off')
        localStorage.setItem('allspin_answer_inputs', Config.answer_inputs? 'on': 'off')
        localStorage.setItem('allspin_find_slot', Config.find_slot? 'on': 'off')
        localStorage.setItem('allspin_review', Config.review? 'on': 'off')
        localStorage.setItem('allspin_focus_weak', Config.focus_weak? 'on': 'off')
        localStorage.setItem('allspin_preview', Config.preview)
        localStorage.setItem('allspin_clears', Config.clears)
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
    var lines = game.line_clear
    if (spin && lines > 0) show_spin_message(`${piece}-Spin ${LINE_NAMES[lines]}!`)
    // Only the requested spins count, in order: the right piece, a real spin, the right number of lines
    var want = Record.spins[Record.done_spins]
    if (want && piece == want.piece){
        if (spin && lines == want.lines){
            Record.done_spins += 1
            Record.miss = null
            update_goal()
            if (Record.done_spins < Record.spins.length) show_spin_message(`${spin_name(want)}! ${Record.done_spins}/${Record.spins.length}`)
        }
        else if (!spin) Record.miss = `The ${piece} wasn't a spin: rotate it into the slot as its last move`
        else if (lines == 0) Record.miss = `${piece}-Spin, but it cleared no lines`
        else Record.miss = `That was a ${piece}-Spin ${LINE_NAMES[lines]}, not a ${LINE_NAMES[want.lines]}`
    }
    play_sound()
    detect_win()
}

// Text with each "X-Spin ..." in the colour of its piece (lighter shades of the
// board's colours, readable on the dark page)
const SPIN_TEXT_COLORS = {S: '#4cdc4c', Z: '#ff5a5a', L: '#ffa640', J: '#6f95ff', I: '#3fe0e8', T: '#e062e0'}
function set_spin_text(el, text){
    el.textContent = ''
    var last = 0
    for (var m of text.matchAll(/\b([SZLJIT])-Spin( (Single|Double|Triple))?/g)){
        el.append(text.slice(last, m.index))
        var span = document.createElement('span')
        span.className = 'spin-name'
        span.style.color = SPIN_TEXT_COLORS[m[1]]
        span.textContent = m[0]
        el.append(span)
        last = m.index + m[0].length
    }
    el.append(text.slice(last))
}

function show_spin_message(text){
    var msg = document.getElementById('spin_message')
    set_spin_text(msg, text)
    msg.classList.remove('flash')
    void msg.offsetWidth
    msg.classList.add('flash')
}

/*
3. keybind
*/

Controls.harddrop = () => do_harddrop()
// Show Hint, in 3 steps for the spin to do next (Record.hint: 0 to 3):
// 1. the rows the spin piece ends in, 2. the setup's pieces still to place, outlined
// in their colours, 3. the slot itself, in the spin piece's colour
const HINT_TEXT = ['', 'Hint 1/3: the spin is in these rows', 'Hint 2/3: the setup to build',
    'Hint 3/3: the slot']
Controls.draw_overlay = (ctx, x, y) => {
    if (Record.finding) draw_finding(ctx, x, y)
    if (Record.review) draw_review(ctx, x, y)
    var spin = Record.hint && Record.spins[Record.done_spins]
    if (!spin || Record.showing) return
    ctx.save()
    var rows = spin.cells.map(c => c[1])
    var top = Math.max(...rows), bottom = Math.min(...rows)
    if (Record.hint == 1){
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
        ctx.fillRect(x, (19-top)*30 + y, 300, (top - bottom + 1)*30)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        ctx.strokeRect(x + 1, (19-top)*30 + y + 1, 298, (top - bottom + 1)*30 - 2)
        ctx.restore()
        return
    }
    if (Record.hint == 2){
        // only where nothing is placed yet
        ctx.lineWidth = 3
        ctx.setLineDash([5, 4])
        for (var p of spin.build){
            ctx.strokeStyle = color_table[p.piece]
            for (var [col, row] of p.cells)
                if (game.board[row][col] == 'N') ctx.strokeRect(col*30 + x + 3, (19-row)*30 + y + 3, 24, 24)
        }
        ctx.restore()
        return
    }
    ctx.globalAlpha = 0.3
    ctx.fillStyle = color_table[spin.piece]
    for (var [col, row] of spin.cells) ctx.fillRect(col*30 + x, (19-row)*30 + y, 30, 30)
    ctx.globalAlpha = 1
    ctx.strokeStyle = color_table[spin.piece]
    ctx.lineWidth = 3
    ctx.setLineDash([6, 4])
    for (var [col, row] of spin.cells) ctx.strokeRect(col*30 + x + 2, (19-row)*30 + y + 2, 26, 26)
    ctx.restore()
}

function toggle_hint(){
    // during the drill, the hint gives up: the slot is shown, not counted
    if (Record.finding && !Record.finding.result){ reveal_slot(null); return }
    Record.hint = (Record.hint + 1) % 4
    hint_label()
    render()
    if (Record.hint) show_spin_message(HINT_TEXT[Record.hint])
}

function hint_label(){
    var button = document.getElementById('hint_button')
    if (button) button.textContent = ['Show Hint', 'More Hint', 'More Hint', 'Hide Hint'][Record.hint || 0]
    if (button && typeof set_short_label == 'function') set_short_label(button)
}
Controls.can_play = () => !Record.showing && !Record.finding && !Record.review

/*
Review after a miss (option, on by default): the board stays as you left it, with
the planned setup for the missed spin over it: its pieces, dashed, where you left a
gap; a cross where you put a piece in the slot, which had to stay empty. Any key or
tap goes on to the retry.
*/
function start_review(why){
    Record.review = {spin: Record.spins[Record.done_spins]}
    game.tetramino = 'G'   // no falling piece over the review
    render()
    show_spin_message(why + ' · Review: dashed = the planned setup, ✗ = the slot, keep it empty. Tap or press a key to retry')
}

var review_ended = 0
function end_review(){
    if (!Record.review) return
    Record.review = null
    review_ended = performance.now()
    document.getElementById('spin_message').textContent = ''
    retry()
}

function draw_review(ctx, x, y){
    var spin = Record.review.spin
    ctx.save()
    ctx.lineWidth = 3
    ctx.setLineDash([5, 4])
    for (var p of spin.build){
        ctx.strokeStyle = color_table[p.piece]
        for (var [col, row] of p.cells)
            if (game.board[row][col] == 'N') ctx.strokeRect(col*30 + x + 3, (19-row)*30 + y + 3, 24, 24)
    }
    ctx.setLineDash([])
    for (var [col, row] of spin.cells){
        var cx = col*30 + x, cy = (19-row)*30 + y
        ctx.strokeStyle = color_table[spin.piece]
        ctx.lineWidth = 2
        ctx.strokeRect(cx + 1, cy + 1, 28, 28)
        if (game.board[row][col] != 'N'){
            ctx.strokeStyle = '#e33'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(cx + 7, cy + 7); ctx.lineTo(cx + 23, cy + 23)
            ctx.moveTo(cx + 23, cy + 7); ctx.lineTo(cx + 7, cy + 23)
            ctx.stroke()
        }
    }
    ctx.restore()
}

// the first key or tap ends the review (and does nothing else)
document.addEventListener('keydown', e => {
    if (!Record.review || is_typing()) return
    e.preventDefault(); e.stopImmediatePropagation()
    end_review()
}, true)
// (the touch that ended it doesn't also press a touch button)
document.addEventListener('touchstart', e => {
    if (performance.now() - review_ended < 400 && e.target.closest('#tcc')) e.stopImmediatePropagation()
}, true)
document.addEventListener('pointerdown', e => {
    if (!Record.review || e.target.closest('button, input, select, a, #rightpanel')) return
    e.preventDefault(); e.stopImmediatePropagation()
    end_review()
}, true)

/*
Find the slot (vision drill, option): before playing a new map or part, tap the 4
cells where the first spin piece will end. Then the answer is shown and play starts.
*/
function find_score(){
    try{ return JSON.parse(localStorage.getItem('allspin_find_score')) || {hits: 0, tries: 0} }
    catch(err){ return {hits: 0, tries: 0} }
}

function start_finding(){
    var spin = Record.spins[0]
    Record.find_for = Record.spins
    Record.finding = {spin: spin, picked: [], result: null}
    render()
    show_spin_message(finding_prompt(''))
}

// the drill's instruction, after `before` (or nothing when not in the drill)
function finding_prompt(before){
    var f = Record.finding
    if (!f || f.result) return ''
    return before + 'Find the slot: tap the 4 cells where the ' + f.spin.piece + ' piece ends its ' +
        spin_name(f.spin) + ' (Hint to give up)'
}

function draw_finding(ctx, x, y){
    var f = Record.finding
    ctx.save()
    if (f.result){
        // the slot, in the spin piece's colour
        ctx.globalAlpha = 0.45
        ctx.fillStyle = color_table[f.spin.piece]
        for (var [col, row] of f.spin.cells) ctx.fillRect(col*30 + x, (19-row)*30 + y, 30, 30)
        ctx.globalAlpha = 1
    }
    ctx.lineWidth = 3
    var slot = new Set(f.spin.cells.map(c => c.join()))
    for (var [col, row] of f.picked){
        ctx.strokeStyle = !f.result? 'white': slot.has(col + ',' + row)? '#4c4': '#e33'
        ctx.strokeRect(col*30 + x + 3, (19-row)*30 + y + 3, 24, 24)
        if (f.result && !slot.has(col + ',' + row)){
            ctx.beginPath()
            ctx.moveTo(col*30 + x + 8, (19-row)*30 + y + 8); ctx.lineTo(col*30 + x + 22, (19-row)*30 + y + 22)
            ctx.moveTo(col*30 + x + 22, (19-row)*30 + y + 8); ctx.lineTo(col*30 + x + 8, (19-row)*30 + y + 22)
            ctx.stroke()
        }
    }
    ctx.restore()
}

function pick_cell(col, row){
    var f = Record.finding
    if (!f || f.result || col < 0 || col > 9 || row < 0 || row > 19) return
    if (game.board[row][col] != 'N') return
    var i = f.picked.findIndex(([c, r]) => c == col && r == row)
    if (i >= 0) f.picked.splice(i, 1)
    else f.picked.push([col, row])
    render()
    if (f.picked.length == 4){
        var slot = new Set(f.spin.cells.map(c => c.join()))
        reveal_slot(f.picked.filter(([c, r]) => slot.has(c + ',' + r)).length)
    }
}

// right: the number of picked cells in the slot, or null when given up
function reveal_slot(right){
    var f = Record.finding
    f.result = right === null? 'skip': right == 4? 'hit': 'miss'
    var text
    if (right === null) text = 'The slot is here'
    else{
        var score = find_score()
        score.tries += 1
        if (right == 4) score.hits += 1
        try{ localStorage.setItem('allspin_find_score', JSON.stringify(score)) }catch(err){}
        text = (right == 4? '✓ Found it!': '✗ ' + right + '/4 cells right: the slot is here') +
            ' · found ' + score.hits + '/' + score.tries
    }
    show_spin_message(text)
    render()
    setTimeout(() => {
        if (Record.finding != f) return
        Record.finding = null
        render()
    }, right == 4? 900: 2200)
}

document.getElementById('board').addEventListener('pointerdown', e => {
    if (!Record.finding) return
    var rect = e.currentTarget.getBoundingClientRect()
    var x = (e.clientX - rect.left) / rect.width * 520, y = (e.clientY - rect.top) / rect.height * 610
    pick_cell(Math.floor((x - 110) / 30), 19 - Math.floor((y - 5) / 30))
    e.preventDefault()
})
Controls.bind_options = () => {
    document.getElementById('input13').oninput = e=>{save_gamemode()}
    for (var id of ['spins', 'continuous', 'answer_inputs', 'find_slot', 'review', 'focus_weak', 'preview', 'clears', 'input16', 'spin_S', 'spin_Z', 'spin_L', 'spin_J', 'spin_I', 'spin_T']){
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
    spin_piece: 'T',   // while generating: the spin piece of the setup being made
    spins: [],         // {piece, lines, cells, build} for each spin to do, in order
    done_spins: 0,
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
                 () => g.rotate_clockwise(), () => g.rotate_anticlockwise(), () => g.rotate_180('simple')]
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
    if (budget_clock() > Record.deadline) return null
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

// Whether this spin clears one line instead of two ("Line clears" option; the flat
// I always clears one). The daily always has doubles.
// In a mix, which spins are singles is drawn once per map (Record.mix_plan, by spin
// index: Record.spin_index), or the doubles, easier to fit, would win most retries.
function wants_single(piece){
    if (piece == 'I' || Daily.seeding || is_daily_map()) return false
    if (Config.clears == 'mix') return (Record.mix_plan || [])[Record.spin_index || 0] || false
    return Config.clears == 'single'
}

function draw_mix_plan(){
    if (Config.clears == 'mix' && !Daily.seeding) Record.mix_plan = [0, 1, 2, 3].map(() => random_int(2) == 0)
}

// only flat slots ever work out (and for T, only pointing down: the T-spin double shape)
function slot_shape(piece){
    var orientation = piece == 'T'? 2: 2 * random_int(2)
    var shape = shape_table[piece][orientation]
    var xs = shape.map(c => c[0]), ys = shape.map(c => c[1])
    return {orientation: orientation, xs: xs, ys: ys, width: Math.max(...xs) - Math.min(...xs) + 1}
}

// The board is a gently bumpy stack with a 3-6 wide well. The player builds the
// setup inside the well (and, for the last spin, on the stack beside it), level
// with the stack except for the way into the slot, then spins in.
// `side`: whether the build may spread onto the stack beside the well.
function try_spin_setup(piece, n_build, side){
    var {orientation, xs, ys, width: slot_width} = slot_shape(piece)
    var single = wants_single(piece)
    // (a single fills fewer cells in its spin rows: one build piece less)
    if (single) n_build = Math.max(1, n_build - 1)

    // The well: the slot plus some spare columns (none needed: cells shut in under
    // the slot, like under a T's arms, are part of the stack). Pick a width where the
    // requested number of pieces fills it to a wall height of about 1-6 rows (one
    // column over the slot stays open), favouring 3 and 4 wide wells like mid-game.
    var spin_rows = Math.max(...ys) - Math.min(...ys) + 1
    var widths = []
    // (a single needs a well column beside the slot for its gap)
    for (var w = slot_width + (single? 1: 0); w <= 6; w++){
        var fill = 4*n_build - (spin_rows*w - 4)
        // (the build can also spread onto the stack beside the well, about 2 columns' worth)
        // (a single also keeps its gap column clear, and the build beside the well can only
        // go on one side of an edge gap)
        var est_wall = single? fill / (w - 2 + (side? 1: 0)): fill / (w - 1 + (side? 2: 0))
        if (est_wall >= 1 && est_wall <= 6) widths.push(w)
    }
    if (widths.length == 0) return null
    var narrow = widths.filter(w => w <= 4)
    var choices = narrow.length && random_int(2)? narrow: widths
    var well_width = choices[random_int(choices.length)]
    var left = random_int(10 - well_width + 1)
    var right = left + well_width - 1
    var slot_left = left + random_int(well_width - slot_width + 1)
    if (single && well_width == slot_width) return null
    var floor = random_int(3)
    var x = slot_left - Math.min(...xs)
    var y = floor - Math.min(...ys)
    var slot = piece_cells(piece, orientation, x, y)
    var slot_cols = [...new Set(slot.map(c => c[0]))]
    var bottom = floor, top = Math.max(...slot.map(c => c[1]))
    var is_slot = (col, row) => slot.some(c => c[0] == col && c[1] == row)
    var in_well = col => col >= left && col <= right

    // the garbage under the floor gets its hole later, under the way into the slot
    var b = empty_board()
    for (var row=0; row<bottom; row++)
        for (var col=0; col<10; col++)
            b[row][col] = 'G'
    for (var row=bottom; row<=top; row++)
        for (var col=0; col<10; col++)
            b[row][col] = !in_well(col)? 'G': is_slot(col, row)? 'N': 'B'
    fill_pockets(b, top)
    return finish_setup({b: b, piece: piece, orientation: orientation, x: x, y: y, slot: slot,
        top: top, bottom: bottom, left: left, right: right, dig: bottom > 0, must_open: [], side: side, single: single}, n_build)
}

// The second spin, on the board left once the first one has cleared its lines,
// in the same well: its slot is where the piece lands if dropped on what is left,
// every other empty cell of its rows is filled by the build, and the walls go up
// to match. A gap left under those rows (the way into the first slot, down to the
// garbage hole) must be open above them too, so the well is clean at the end.
// `pockets`: cells shut in under the slot may become stack (only when planning from
// the board in play, where the start check still rejects stack over empty cells)
function try_second_setup(R, left, right, piece, n_build, pockets){
    var {orientation, xs, ys, width: slot_width} = slot_shape(piece)
    var single = wants_single(piece)
    // (a single fills fewer cells in its spin rows: one build piece less)
    if (single) n_build = Math.max(1, n_build - 1)
    if (slot_width + (piece == 'T'? 2: 0) + (single? 1: 0) > right - left + 1) return null
    var slot_left = left + random_int(right - left - slot_width + 2)
    var g = new Game()
    g.board = R
    g.tetramino = piece
    g.orientation = orientation
    g.x = slot_left - Math.min(...xs)
    g.y = 17
    if (g.is_collide()) return null
    g.drop()
    var x = g.x, y = g.y
    var slot = piece_cells(piece, orientation, x, y)
    var bottom = Math.min(...slot.map(c => c[1]))
    var top = Math.max(...slot.map(c => c[1]))
    var must_open = []
    for (var col=left; col<=right; col++)
        if (bottom > 0 && R[bottom-1][col] == 'N') must_open.push(col)
    // (for a single, finish_setup checks: the gap's column can be one of them too)
    if (!single && !must_open.every(col => slot.some(c => c[0] == col))) return null
    var b = clone(R)
    // Outside the well, every empty cell up to the spin rows is filled. The stack only
    // grows up from stack; over a piece of the first build (placed beside the well)
    // the cell becomes part of this build if it's in the spin rows, and below them
    // this slot can't be used (it would leave a hole).
    for (var row=0; row<=top; row++)
        for (var col=0; col<10; col++){
            if (b[row][col] != 'N') continue
            if (col < left || col > right){
                if (row == 0 || b[row-1][col] == 'G') b[row][col] = 'G'
                else if (row >= bottom) b[row][col] = 'B'
                else return null
            }
            else if (row >= bottom && !slot.some(c => c[0] == col && c[1] == row)) b[row][col] = 'B'
        }
    if (pockets) fill_pockets(b, top)
    return finish_setup({b: b, piece: piece, orientation: orientation, x: x, y: y, slot: slot,
        top: top, bottom: bottom, left: left, right: right, dig: false, must_open: must_open, side: true, single: single}, n_build)
}

// Height offsets of the stack outside the well, a random walk outwards from each
// side of the well: mostly level, a step of 1 up or down now and then, kept within
// -1..1, so the stack is a little uneven like a mid-game board
function terrain_bumps(left, right){
    var bumps = Array(10).fill(0)
    var walk = cols => {
        var h = random_int(3) == 0? random_int(3) - 1: 0
        for (var col of cols){
            bumps[col] = h
            if (random_int(3) == 0) h = Math.max(-1, Math.min(1, h + (random_int(2)? 1: -1)))
        }
    }
    var left_cols = [], right_cols = []
    for (var col=left-1; col>=0; col--) left_cols.push(col)
    for (var col=right+1; col<10; col++) right_cols.push(col)
    walk(left_cols)
    walk(right_cols)
    return bumps
}

// Cells to build in the spin rows that no piece could reach, shut in under the slot
// (under a T's arms in a 3-wide well, the corner under an S...), are part of the
// stack instead, as in a mid-game board: groups of 'B' cells not reaching the top row.
function fill_pockets(b, top){
    var seen = new Set()
    for (var row=0; row<=top; row++)
        for (var col=0; col<10; col++){
            if (b[row][col] != 'B' || seen.has(cell_key(col, row))) continue
            var group = [], stack = [[col, row]], open = false
            seen.add(cell_key(col, row))
            while (stack.length){
                var [c, r] = stack.pop()
                group.push([c, r])
                if (r == top) open = true
                for (var [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
                    var nc = c + dc, nr = r + dr
                    if (nc < 0 || nc > 9 || nr < 0 || nr > top || b[nr][nc] != 'B' || seen.has(cell_key(nc, nr))) continue
                    seen.add(cell_key(nc, nr))
                    stack.push([nc, nr])
                }
            }
            if (!open) for (var [c, r] of group) b[r][c] = 'G'
        }
}

// the garbage rows under the floor, with their hole in this column
function dig(board, bottom, col){
    var nb = clone(board)
    for (var row=0; row<bottom; row++) nb[row][col] = 'N'
    return nb
}

// Caps over the slot, walls and the level build on top of the spin rows: `b` has
// the spin rows done (walls 'G', cells to build 'B', the slot empty)
function finish_setup(s, n_build){
    var {b, piece, orientation, x, y, slot, top, bottom, left, right} = s
    var well_width = right - left + 1
    var slot_cols = [...new Set(slot.map(c => c[0]))]
    var in_well = col => col >= left && col <= right
    // the stack around the well is a little uneven like a mid-game board: each column
    // at most 1 row above or below the wall height, neighbours at most 1 apart, and
    // the columns beside the well at least 1 high so the well stays a well
    var bumps = terrain_bumps(left, right)
    var wall_height = (col, wall) => Math.max(col == left - 1 || col == right + 1? 1: 0, wall + bumps[col])
    var with_walls = (board, wall) => {
        var nb = clone(board)
        for (var col=0; col<10; col++){
            if (in_well(col)) continue
            // The stack only grows up from stack: for the second spin, where the first
            // build put pieces on this column, no stack goes above them (it would float
            // over cells that are empty at the start)
            for (var row=top+1; row<=Math.min(top + wall_height(col, wall), 19); row++){
                if (nb[row][col] != 'N' || (row > 0 && nb[row-1][col] != 'G')) break
                nb[row][col] = 'G'
            }
        }
        return nb
    }

    // A single: one cell of the slot's top row stays empty, in a well column beside
    // the slot with nothing built above it (and something under it), so only the
    // bottom row clears and the gap stays open (the well is clean at the end)
    // Columns that must stay open to the bottom (a gap under the spin rows, the
    // garbage hole) are the gap's, or one where the slot has no cell in the top row.
    var gap_col = null
    var clear_after = col => s.single? !slot.some(c => c[0] == col && c[1] == top): slot_cols.includes(col)
    if (s.single){
        if (top == bottom) return null
        var gaps = []
        for (var col=left; col<=right; col++)
            // (for the first spin, right beside the slot's top row: elsewhere it mostly cuts
            // off a column of the build; later spins, in a set well, take any that works)
            if (!slot_cols.includes(col) && b[top][col] == 'B' && b[bottom][col] != 'N' &&
                (Record.spin_index > 0 || slot.some(c => c[1] == top && Math.abs(c[0] - col) == 1)) &&
                s.must_open.every(c => c == col || (slot_cols.includes(c) && clear_after(c)))) gaps.push(col)
        if (gaps.length == 0) return null
        gap_col = gaps[random_int(gaps.length)]
        b = clone(b)
        b[top][gap_col] = 'N'
        // cells cut off by the gap (under it, in a narrow well) are stack, as in a
        // T-spin single's hole
        fill_pockets(b, top)
    }

    var spin_row_cells = b.flat().filter(c => c == 'B').length
    var need = 4*n_build - spin_row_cells
    // the build goes in the well and may spread onto the stack beside it (up to 2
    // columns each side), filling its dips and rising up to 3 rows above the wall
    // height (the second setup's stack never goes above those pieces: with_walls)
    var side_cols = s.side? [left-2, left-1, right+1, right+2].filter(col => col >= 0 && col < 10): []
    // (nothing is built past a gap at the edge of the well: it would be cut off)
    if (gap_col === left) side_cols = side_cols.filter(col => col > right)
    if (gap_col === right) side_cols = side_cols.filter(col => col < left)
    // cheap early exit: the wall height would be out of range whatever gets capped
    if (need < well_width - slot_cols.length || need > 6 * (well_width + side_cols.length)) return null

    // Over the slot, try every choice of capped columns (at most 16) and keep the
    // ones where the slot is reachable, and only by a final rotation. The columns left
    // open are clear down to the garbage hole once the spin is done, so the hole goes
    // under one of them (and 'must_open' columns have a gap under the spin rows).
    var valid = []
    for (var mask=0; mask < (1 << slot_cols.length); mask++){
        var h = Array(10).fill(0)
        slot_cols.forEach((col, i) => { if (mask & (1 << i)) h[col] = 1 })
        var open = slot_cols.filter((col, i) => !(mask & (1 << i)))
        if (!s.must_open.every(col => open.includes(col) || col == gap_col)) continue
        // a cell to build in the top spin row, in an open column with nothing to build
        // beside it, could only be filled from above: nothing can fill it
        if (open.some(col => b[top][col] == 'B' && b[top][col-1] != 'B' && b[top][col+1] != 'B')) continue
        var test = with_stacks(with_walls(b, 1), h, top)
        if (!s.dig){
            if (is_spin_slot(test, piece, orientation, x, y, slot)) valid.push({open: open})
            continue
        }
        // (after a single, the slot's top row stays: the hole goes under the gap or a
        // column clear of it)
        for (var col of shuffle(open.filter(clear_after).concat(gap_col === null? []: [gap_col]))){
            if (is_spin_slot(dig(test, bottom, col), piece, orientation, x, y, slot)){
                valid.push({open: open, hole: col})
                break
            }
        }
    }
    if (valid.length == 0) return null
    var choice = valid[random_int(valid.length)]
    var open_cols = choice.open
    if (s.dig) b = dig(b, bottom, choice.hole)

    // the wall height that makes the build take n_build pieces when the rest of the
    // well (and the dips of the stack beside it) is filled level with it
    var filled_cols = []
    for (var col=left; col<=right; col++)
        if (!open_cols.includes(col) && col != gap_col) filled_cols.push(col)
    var build_cols = filled_cols.concat(side_cols)
    // empty cells of a column up to k rows above the spin rows (for the second spin some
    // are already filled by what's left of the first; beside the well, the stack's)
    var fill = (board, col, k) => {
        var n = 0
        for (var row=top+1; row<=Math.min(top+k, 19); row++) if (board[row][col] == 'N') n++
        return n
    }
    // The lowest wall height that can take the build (what doesn't fit in the well
    // goes on the stack beside it): a shallow well keeps the way into the slot open,
    // which a narrow well needs, and looks like a mid-game board.
    var wall = 0
    for (var w=1; w<=6 && !wall; w++){
        var walled = with_walls(b, w)
        var most = build_cols.reduce((a, col) => a + fill(walled, col, w + (in_well(col)? 1: 3)), 0)
        var least = build_cols.reduce((a, col) => a + fill(walled, col, w - 1), 0)
        if (least <= need && need <= most) wall = w
    }
    if (!wall) return null
    // leave room to spawn above the walls
    var tallest = 0
    for (var col=0; col<10; col++) if (!in_well(col)) tallest = Math.max(tallest, wall_height(col, wall))
    if (top + Math.max(wall + 3, tallest) > 16) return null
    var nw = with_walls(b, wall)

    // Every near-level fill with the right number of cells: each well column at the
    // wall height or one above or below, each column beside the well filled up to
    // between one below and three above it (so nothing where its stack is higher).
    // Flattest first; tetrominoes can only fill it if each group of touching cells
    // is a multiple of 4.
    // (scored first, boards built only for the best few)
    var low = build_cols.map(() => -1)
    var high = build_cols.map(col => in_well(col)? 1: 3)
    // cells each column adds at each offset
    var adds = build_cols.map((col, i) => {
        var list = []
        for (var o=low[i]; o<=high[i]; o++) list.push(fill(nw, col, wall + o))
        return list
    })
    var candidates = [], seen = new Set()
    var offsets = [...low]
    while (true){
        var total = 0
        for (var i=0; i<offsets.length; i++) total += adds[i][offsets[i] - low[i]]
        if (total == need){
            // the same cells can come from different offsets beside the well (none added
            // where the stack is already higher): keep one
            var key = offsets.map((o, i) => adds[i][o - low[i]] + (in_well(build_cols[i])? ':' + o: '')).join(',')
            if (!seen.has(key)){
                seen.add(key)
                var bumps = 0
                for (var i=0; i<offsets.length; i++)
                    bumps += in_well(build_cols[i])? (offsets[i] != 0? 1: 0): adds[i][offsets[i] - low[i]] / 4
                candidates.push({offsets: [...offsets], bumps: bumps + Math.random()})
            }
        }
        var i = 0
        while (i < offsets.length && offsets[i] == high[i]){ offsets[i] = low[i]; i++ }
        if (i == offsets.length) break
        offsets[i] += 1
    }
    candidates.sort((p, q) => p.bumps - q.bumps)
    var profiles = []
    for (var candidate of candidates){
        if (profiles.length == 4) break
        var h = Array(10).fill(0)
        build_cols.forEach((col, i) => h[col] = wall + candidate.offsets[i])
        var nb = with_stacks(nw, h, top)
        var cells = new Set()
        for (var row=0; row<20; row++)
            for (var col=0; col<10; col++)
                if (nb[row][col] == 'B') cells.add(cell_key(col, row))
        // a full row would clear while the player builds
        if (groups_of_four(cells) && !nb.slice(top+1).some(row => row.every(c => c != 'N')))
            profiles.push({board: nb, cells: cells})
    }

    for (var {board: nb, cells: cells} of profiles){
        if (!is_spin_slot(nb, piece, orientation, x, y, slot)) continue
        // split the build into pieces the player can place in order
        var finished = clone(nb)
        var build = carve(nb, cells, [])
        if (!build){
            if (budget_clock() > Record.deadline) return null
            continue
        }
        // the finished board with each piece in its own colour, for Show Answer
        for (var {piece: p, cells: pc} of build)
            for (var [col, row] of pc) finished[row][col] = p
        return {board: finished, lines: s.single? 1: top - bottom + 1, cells: slot, build: build, piece: piece,
            left: left, right: right, bottom: bottom, top: top}
    }
    return null
}

// the board after the spin piece fills its slot and the full rows clear
function after_spin(board, setup){
    var nb = clone(board)
    for (var [col, row] of setup.cells) nb[row][col] = setup.piece
    var rows = nb.filter(row => row.some(c => c == 'N'))
    while (rows.length < 20) rows.push(Array(10).fill('N'))
    return rows
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
        for (var row=top+1; row<=top+heights[col]; row++) if (nb[row][col] == 'N') nb[row][col] = 'B'
    return nb
}

function is_spin_slot(b, piece, orientation, x, y, slot){
    var g = new Game()
    g.board = b
    g.tetramino = piece
    g.x = x; g.y = y; g.orientation = orientation
    if (g.is_collide()) return false
    // stuck left, right and up (a spin), and resting (it doesn't fall on after the spin)
    for (var [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]]){
        g.x = x+dx; g.y = y+dy
        if (!g.is_collide()) return false
    }
    return can_reach(b, piece, slot)
}

// 4.2 build a map, shuffle the queue and play / restart

// Per-spin results, kept in the browser: {"T-Spin Double": [done, tries], ...}. A try
// is a spin reached in an attempt: done if it was made, missed if the attempt ended there.
function spin_stats(){
    try{ return JSON.parse(localStorage.getItem('allspin_spin_stats')) || {} }
    catch(err){ return {} }
}

function log_spins(){
    // (not while Show Answer replays, nor in the daily's seeded runs)
    if (Record.showing) return
    var stats = spin_stats()
    Record.spins.slice(0, Record.done_spins + 1).forEach((spin, i) => {
        var s = stats[spin_name(spin)] || [0, 0]
        s[1] += 1
        if (i < Record.done_spins) s[0] += 1
        stats[spin_name(spin)] = s
    })
    try{ localStorage.setItem('allspin_spin_stats', JSON.stringify(stats)) }catch(err){}
}

// The spin pieces to try, in order: shuffled, or with "Focus on my weak spins",
// drawn with a weight that grows with the piece's miss rate (a piece never tried
// counts as half missed), so the weak ones come first more often.
function piece_order(){
    var pieces = [...Config.spin_pieces]
    if (!Config.focus_weak || Daily.seeding || is_daily_map()) return shuffle(pieces)
    var stats = spin_stats(), order = []
    var weight = piece => {
        var done = 0, tries = 0
        for (var name in stats) if (name[0] == piece){ done += stats[name][0]; tries += stats[name][1] }
        return 1 + 6 * (tries - done + 1) / (tries + 2)
    }
    while (pieces.length){
        var weights = pieces.map(weight), total = weights.reduce((a, b) => a + b), r = Math.random() * total
        var i = 0
        while (i < pieces.length - 1 && r >= weights[i]){ r -= weights[i]; i++ }
        order.push(pieces.splice(i, 1)[0])
    }
    return order
}

// The first spin. Pick the spin piece first (not per attempt), so rarer setups like
// T come up as often. Some piece/size combinations are rare or impossible in a well
// (a flat I-spin leaves little room), so each attempt picks a size near the one asked
// for, favouring the exact size, and after a while moves on to another piece.
function first_setup(n_build, side){
    var setup = null
    Record.spin_index = 0
    for (var piece of piece_order()){
        Record.spin_piece = piece
        var sizes = [n_build, n_build, n_build, n_build+1, n_build-1].filter(n => n >= 2 && n <= 6)
        var give_up = budget_clock() + 700
        while (!setup && budget_clock() < give_up){
            Record.deadline = budget_clock() + 100
            setup = try_spin_setup(piece, sizes[random_int(sizes.length)], side)
        }
        if (setup) return setup
    }
    // last resort: any piece, any size
    while (!setup){
        Record.spin_piece = "SZLJIT"[random_int(6)]
        Record.deadline = budget_clock() + 100
        setup = try_spin_setup(Record.spin_piece, 2 + random_int(4), side)
    }
    return setup
}

// The spins after the first, each built on what the previous one leaves.

// Rows of a setup's board sit higher on the starting board by the lines cleared
// before it: map a row of the board left after spins 1..i (0-based: after chain[i])
// back to the starting board
function row_at_start(chain, i, row){
    for (var j=i; j>=0; j--)
        if (row >= chain[j].bottom) row += chain[j].lines
    return row
}

// The starting board of a chain of setups: the first setup's board, plus the stack
// each later setup adds, moved up by the lines cleared before it. null if the stack
// would leave no room to spawn.
function chain_start(chain){
    var start = clone(chain[0].board)
    for (var i=1; i<chain.length; i++){
        var before = after_spin(chain[i-1].board, chain[i-1])
        for (var row=0; row<20; row++)
            for (var col=0; col<10; col++)
                if (chain[i].board[row][col] == 'G' && before[row][col] != 'G'){
                    var r = row_at_start(chain, i-1, row)
                    if (r > 16) return null
                    start[r][col] = 'G'
                }
    }
    return start
}

// where the spin piece sits in its slot: [orientation, x, y]
function slot_pose(setup){
    var want = setup.cells.map(c => c.join()).sort().join('|')
    for (var o=0; o<4; o++)
        for (var [dx, dy] of shape_table[setup.piece][o]){
            var [tx, ty] = setup.cells[0]
            if (piece_cells(setup.piece, o, tx - dx, ty - dy).map(c => c.join()).sort().join('|') == want)
                return [o, tx - dx, ty - dy]
        }
    return null
}

// Play the whole solution on the real starting board: every build piece can be
// reached where it goes, every slot is a spin slot that clears its lines, and the
// well is clean after the last spin. (The later setups' taller stack must not get
// in the way of the earlier ones.)
function chain_works(start, chain){
    return chain_end(start, chain) != null
}

// The board once the whole solution is played, or null if it doesn't work out
function chain_end(start, chain){
    // a chain planned from the board in play (continuous mode) starts from it as it
    // is; otherwise only the stack is there at the start
    var b = chain[0].base? clone(start): start.map(row => row.map(c => c == 'G'? 'G': 'N'))
    for (var setup of chain){
        if (setup.base) continue
        for (var {piece, cells} of [...setup.build].reverse()){
            if (!can_reach(b, piece, cells)) return null
            for (var [col, row] of cells) b[row][col] = piece
        }
        var pose = slot_pose(setup)
        if (!pose || !is_spin_slot(b, setup.piece, pose[0], pose[1], pose[2], setup.cells)) return null
        for (var [col, row] of setup.cells) b[row][col] = setup.piece
        var rows = b.filter(row => row.some(c => c == 'N'))
        if (20 - rows.length != setup.lines) return null
        while (rows.length < 20) rows.push(Array(10).fill('N'))
        b = rows
    }
    var last = chain[chain.length-1]
    return is_clean(b, last.left, last.right)? b: null
}

// One more setup on what the chain leaves, or null if nothing fits in time
function next_setup(chain, n_build){
    var prev = chain[chain.length-1]
    var R = after_spin(prev.board, prev)
    var give_up = budget_clock() + 500
    while (budget_clock() < give_up){
        var piece = piece_order()[0]
        // (the flat I-spin fits most easily: tried a quarter as often until near the end)
        if (piece == 'I' && !Daily.seeding && Config.spin_pieces.length > 1 && budget_clock() < give_up - 150 && random_int(4)) continue
        Record.spin_piece = piece
        Record.spin_index = chain.filter(s => !s.base).length
        Record.deadline = budget_clock() + 100
        var sizes = [n_build, n_build, n_build+1, n_build-1].filter(n => n >= 1 && n <= 6)
        var setup = try_second_setup(R, prev.left, prev.right, piece, sizes[random_int(sizes.length)], chain[0].base)
        if (!setup) continue
        var longer = chain.concat([setup])
        var start = chain_start(longer)
        if (start && clean_start(start, chain[0].base) && chain_works(start, longer)) return {chain: longer, start: start}
    }
    return null
}

// A map with k spins: {chain, start}, or null
function chain_setup(k, n_build){
    var first = first_setup(n_build, true)
    var result = {chain: [first], start: first.board}
    if (!clean_start(first.board) || !chain_works(first.board, [first])) return null
    for (var i=1; i<k; i++){
        result = next_setup(result.chain, n_build)
        if (!result) return null
    }
    return result
}

function play_a_map(){
    stop_answer()
    draw_mix_plan()
    var result = new_map()
    Record.well = [result.chain[0].left, result.chain[0].right]
    Record.part = 1
    document.getElementById('spin_message').textContent = ''
    set_plan(result.chain, result.start, false)
}

// A new map: {chain, start}
function new_map(){
    var n_build = Config.no_of_piece - 1
    var result = null
    for (var attempt=0; attempt<10 && !result; attempt++) result = chain_setup(Config.spins, n_build)
    // very rarely nothing fits on top: settle for fewer spins
    for (var k=Config.spins-1; k>=1 && !result; k--)
        for (var attempt=0; attempt<10 && !result; attempt++) result = chain_setup(k, n_build)
    while (!result) result = chain_setup(1, n_build)
    // continuous mode: prefer a first part whose end board has a next part
    if (Config.continuous)
        for (var attempt=0; attempt<6; attempt++){
            var end = chain_end(result.start, result.chain)
            if (end && has_next(end, lines_of(result.chain), n_build)) break
            var other = chain_setup(Config.spins, n_build)
            if (other) result = other
        }
    return result
}

// Start playing a plan: its spins, the starting board and the queue. `in_play`: the
// board is the one from the game in progress (continuous mode), pieces included.
function set_plan(spins, start, in_play){
    Record.spins = spins.map(s => ({piece: s.piece, lines: s.lines, cells: s.cells, build: s.build}))
    prepare_next_part(start)
    Record.board = [start]
    Record.in_play = in_play
    // each spin's pieces are shuffled on their own (the hold table goes up to 7 pieces):
    // build pieces go in the reverse of the order they were carved out, then the spin piece
    Record.shuffled_queue = []
    for (var s of spins){
        var queue = s.build.map(p => p.piece).reverse().concat([s.piece])
        var shuffled = get_shuffled_holdable_queue(queue)
        Record.shuffled_queue = Record.shuffled_queue.concat(shuffled.length? shuffled: queue)
    }
    play()
    render()
}

/*
Continuous mode: once the planned spins are done, the next ones are planned from the
board as it is now (same well, new pieces), so the game goes on whatever way you
built. A missed part restarts from its own start: the checkpoint.
*/
// Where the well is now: after a part, your pieces beside it may have moved its
// edges. Candidates: windows 3-6 wide around the deepest column, preferably ones
// no higher than the columns on each side (the board's edge counts as a wall);
// the planner rejects the ones where nothing fits.
function well_candidates(board){
    var heights = []
    for (var col=0; col<10; col++){
        var h = 0
        for (var row=0; row<20; row++) if (board[row][col] != 'N') h = row + 1
        heights.push(h)
    }
    var low = Math.min(...heights), found = [], walled = []
    for (var w=3; w<=6; w++)
        for (var left=0; left+w<=10; left++){
            var cols = heights.slice(left, left+w)
            if (!cols.includes(low)) continue
            found.push([left, left+w-1])
            var sides = [left > 0? heights[left-1]: 20, left+w < 10? heights[left+w]: 20]
            if (Math.max(...cols) <= Math.min(...sides)) walled.push([left, left+w-1])
        }
    return walled.length? walled: found
}

// Can a next part be planned on the board a plan leaves (after its garbage)? A plan
// that leads to a dead end would mean a new board at the next checkpoint.
function has_next(end, cleared, n_build){
    var next = add_garbage(clone(end), cleared).board
    for (var i=0; i<2; i++) if (plan_from(next, 1, n_build, false)) return true
    return false
}

function lines_of(chain){
    return chain.reduce((a, s) => a + (s.lines || 0), 0)
}

// lookahead: only keep a plan if the board it leaves still has a next part
function plan_from(board, k, n_build, lookahead){
    // the pieces already on the board are there for good: to the planner they are
    // stack like the rest (new stack may go on top of them)
    var solid = board.map(row => row.map(c => c == 'N'? 'N': 'G'))
    var wells = well_candidates(board)
    if (wells.length == 0) return null
    var well = wells[random_int(wells.length)]
    var base = {base: true, board: solid, bottom: 20, lines: 0, cells: [], build: [],
        left: well[0], right: well[1]}
    var result = {chain: [base], start: solid}
    for (var i=0; i<k; i++){
        result = next_setup(result.chain, n_build)
        if (!result) return null
    }
    // keep the board low enough to go on: at most 12 rows at the start of a part
    for (var row=12; row<20; row++) if (result.start[row].some(c => c != 'N')) return null
    if (lookahead){
        var end = chain_end(result.start, result.chain)
        if (!end || !has_next(end, lines_of(result.chain), n_build)) return null
    }
    // the real board, pieces keeping their colours, plus the new stack
    var start = clone(board)
    for (var row=0; row<20; row++)
        for (var col=0; col<10; col++)
            if (result.start[row][col] == 'G' && solid[row][col] != 'G') start[row][col] = 'G'
    return {chain: result.chain.slice(1), start: start, well: well}
}

// Garbage rising from the bottom, as many rows as the part cleared: the board keeps
// its height and the next setups have stack to work with. The holes line up with the
// columns that are empty all the way down (the well's open shaft), so no hole is ever
// covered and the next spins can clear the garbage; none is added when no column is
// empty, or beyond 8 rows of stack (room for the next setups).
function add_garbage(board, rows){
    var height = 0
    for (var row=0; row<20; row++) if (board[row].some(c => c != 'N')) height = row + 1
    rows = Math.min(rows, Math.max(0, 8 - height))
    var holes = []
    for (var col=0; col<10; col++) if (board.every(line => line[col] == 'N')) holes.push(col)
    if (rows == 0 || holes.length == 0) return {board: board, rows: 0}
    var nb = board.slice(0, 20 - rows)
    for (var i=0; i<rows; i++) nb.unshift([...Array(10)].map((c, col) => holes.includes(col)? 'N': 'G'))
    return {board: nb, rows: rows}
}

// The next part, planned from `board` (the board once the spins are done): the plan
// on the board with its garbage, or null if nothing fits (then a new board)
function plan_next_part(board, cleared){
    var n_build = Config.no_of_piece - 1
    var plan = null
    var garbage = add_garbage(clone(board), cleared)
    // about 1.5 s at most before settling for a fresh map
    var give_up = budget_clock() + 1500
    for (var k=Config.spins; k>=1 && !plan; k--)
        while (!plan && budget_clock() < give_up - (k - 1) * 400) plan = plan_from(garbage.board, k, n_build, true)
    // a plan without the look-ahead rather than a new board
    while (!plan && budget_clock() < give_up + 800) plan = plan_from(garbage.board, 1, n_build, false)
    return plan
}

// The next part is planned ahead, in the background (allspin-worker.js), from the
// board the planned solution leaves; when you finish the part with the same cells
// filled (whatever the pieces), it's used as is, with no pause. Otherwise it is
// planned then, from your board.
var planner = {worker: null, id: 0, ready: null}

// the cells filled, as a key
const fill_key = board => board.map(row => row.map(c => c == 'N'? '.': '#').join('')).join('/')

function prepare_next_part(start){
    planner.ready = null
    planner.id += 1
    if (!Config.continuous || typeof Worker == 'undefined' || typeof PLANNER != 'undefined') return
    // the board once the planned solution is played
    var end = clone(start)
    for (var s of Record.spins){
        for (var p of s.build.concat([{piece: s.piece, cells: s.cells}]))
            for (var [col, row] of p.cells) end[row][col] = p.piece
        var rows = end.filter(row => row.some(c => c == 'N'))
        while (rows.length < 20) rows.push(Array(10).fill('N'))
        end = rows
    }
    try{
        if (!planner.worker){
            planner.worker = new Worker('allspin-worker.js')
            planner.worker.onmessage = e => {
                if (e.data.id == planner.id) planner.ready = e.data
            }
            planner.worker.onerror = () => { planner.worker = null }
        }
        planner.worker.postMessage({id: planner.id, board: end, key: fill_key(end),
            cleared: Record.spins.reduce((a, s) => a + s.lines, 0),
            config: {spins: Config.spins, no_of_piece: Config.no_of_piece, clears: Config.clears,
                spin_pieces: Config.spin_pieces, unqiue_ind: Config.unqiue_ind, focus_weak: Config.focus_weak,
                continuous: true},
            stats: localStorage.getItem('allspin_spin_stats')})
    }
    catch(err){ planner.worker = null }
}

function next_part(){
    var cleared = Record.spins.reduce((a, s) => a + s.lines, 0)
    var garbage = add_garbage(clone(game.board), cleared)
    var ready = planner.ready && planner.ready.key == fill_key(game.board)? planner.ready: null
    var plan = null, fresh = null
    if (ready){
        // planned ahead on the same cells: put it on the real board (its pieces' colours)
        if (ready.plan){
            plan = ready.plan
            var start = clone(garbage.board)
            for (var row=0; row<20; row++)
                for (var col=0; col<10; col++)
                    if (plan.start[row][col] != 'N' && start[row][col] == 'N') start[row][col] = 'G'
            plan.start = start
        }
        else fresh = ready.fresh
    }
    else{
        draw_mix_plan()
        plan = plan_next_part(game.board, cleared)
    }
    if (!plan){
        // nothing fits on this board any more: go on with a fresh board
        var part = Record.part + 1
        stop_answer()
        if (!fresh){
            draw_mix_plan()
            fresh = new_map()
        }
        Record.well = [fresh.chain[0].left, fresh.chain[0].right]
        Record.part = part
        set_plan(fresh.chain, fresh.start, false)
        show_spin_message('Part ' + part + ' · new board' + finding_prompt(' · '))
        return
    }
    Record.part += 1
    Record.well = plan.well
    set_plan(plan.chain, plan.start, true)
    show_spin_message('Part ' + Record.part + (garbage.rows? ' · +' + garbage.rows + ' garbage': '') + finding_prompt(' · '))
}

// The starting board (the stack, before anything is built) has no stack cell over
// an empty one, in any column. `in_play`: a board from the game in progress, where
// the pieces already placed are there too (only empty cells count as gaps).
function clean_start(board, in_play){
    for (var col=0; col<10; col++){
        var gap = false
        for (var row=0; row<20; row++){
            if (in_play? board[row][col] == 'N': board[row][col] != 'G') gap = true
            else if (gap) return false
        }
    }
    return true
}

// no empty cell of the well under a filled one
function is_clean(board, left, right){
    for (var col=left; col<=right; col++){
        var gap = false
        for (var row=0; row<20; row++){
            if (board[row][col] == 'N') gap = true
            else if (gap) return false
        }
    }
    return true
}

function spin_name(spin){
    return `${spin.piece}-Spin ${LINE_NAMES[spin.lines]}`
}

// "S-Spin → T-Spin", with the done ones ticked. The lines cleared are only named
// with the Mix option (otherwise they're always the same: I-spins single, the others
// as the option says).
function update_goal(){
    var parts = Record.spins.map((spin, i) => (i < Record.done_spins? '✓ ': '') +
        (Config.clears == 'mix' && spin.piece != 'I'? spin_name(spin): spin.piece + '-Spin'))
    set_spin_text(document.getElementById('winning_requirement1'),
        (Config.continuous? 'Part ' + (Record.part || 1) + ': ': '') + parts.join(' → '))
}

function play(){
    // a restart (Retry, a new map...) during Show Answer stops the replay
    if (Record.showing && !Record.answer_starting){
        stop_answer()
        document.getElementById('spin_message').textContent = ''
    }
    game = new Game()
    Record.done_spins = 0
    Record.miss = null
    Record.solved = false
    // a new attempt starts without the hint
    Record.hint = 0
    hint_label()
    game.bag = Record.shuffled_queue.concat(Array(14).fill('G'))
    game.update()
    game.holdmino = ''
    game.hold()
    Record.finding = null
    Record.review = null
    // a one-piece queue would otherwise start with the piece stuck in hold
    if (game.tetramino == 'G') game.hold()
    if (Record.board.length > 0){
        game.board = clone(Record.board[Record.board.length-1])
        // (a board from the game in progress keeps its pieces: the checkpoint)
        if (!Record.in_play)
            for (var row_idx=0; row_idx<20; row_idx++)
                for (var col_idx=0; col_idx<10; col_idx++)
                    if (game.board[row_idx][col_idx] != 'G')
                        game.board[row_idx][col_idx] = 'N'
    }
    update_goal()
    // the vision drill, once per map or part (not again on a retry)
    if (Config.find_slot && !Record.showing && Record.find_for !== Record.spins && Record.spins.length)
        start_finding()
}

function detect_win(){
    if (game.total_piece == 1){
        Config.no_of_trial += 1}
    if (Record.solved) return
    // done as soon as every requested spin is: pieces left in the queue aren't needed
    if (Record.done_spins == Record.spins.length){
        Record.solved = true
        log_spins()
        Config.no_of_success += 1
        if (Config.continuous){
            report_result(true, 'Part ' + Record.part + ' done')
            next_part()
            return
        }
        report_result(true, 'Solved!')
        if (Config.auto_next_ind) play_a_map()
        else{
            // nothing left to place
            game.bag = game.bag.map(() => 'G')
            game.tetramino = 'G'
            game.holdmino = ''
            render()
        }
        return
    }
    if (game.total_piece == Record.shuffled_queue.length){
        var why = Record.miss || `No ${spin_name(Record.spins[Record.done_spins])}`
        log_spins()
        report_result(false, why)
        // (not in a rush: a miss moves on to the next puzzle)
        if (Config.review && !rush.on && Record.spins[Record.done_spins]) start_review(why)
        else retry()
    }
}

// The fewest inputs from spawn to a resting placement covering exactly `target`:
// [{move, x, y, orientation}], or null. Moves are the player's: left, right, soft
// drop to the bottom, and the three rotations (180 with the simple kicks, which
// work whatever the 180 setting).
const MOVE_LABELS = {L: '←', R: '→', D: '↓', CW: '↻', CCW: '↺', '180': '180'}
function input_path(board, piece, target){
    var want = target.map(c => c.join()).sort().join('|')
    var g = new Game()
    g.board = board
    g.tetramino = piece
    g.x = 4; g.y = 18; g.orientation = 0
    if (g.is_collide()) return null
    var key = (x, y, o) => x + ',' + y + ',' + o
    var moves = [['L', () => g.move_left()], ['R', () => g.move_right()],
                 ['D', () => { var y = g.y; g.drop(); return g.y != y }],
                 ['CW', () => g.rotate_clockwise()], ['CCW', () => g.rotate_anticlockwise()],
                 ['180', () => g.rotate_180('simple')]]
    var came = new Map([[key(4, 18, 0), null]])
    var queue = [[4, 18, 0]]
    for (var head=0; head<queue.length; head++){
        var [x, y, o] = queue[head]
        for (var [name, move] of moves){
            g.x = x; g.y = y; g.orientation = o
            if (!move()) continue
            var k = key(g.x, g.y, g.orientation)
            if (came.has(k)) continue
            came.set(k, {from: key(x, y, o), move: name, x: g.x, y: g.y, orientation: g.orientation})
            queue.push([g.x, g.y, g.orientation])
            g.y -= 1
            var rests = g.is_collide()
            g.y += 1
            if (rests && g.to_shape().map(c => c.join()).sort().join('|') == want){
                var path = [], step = came.get(k)
                while (step){ path.unshift(step); step = came.get(step.from) }
                return path
            }
        }
    }
    return null
}

// Show Answer: replay the solution from the starting board, one build piece at a
// time in the order you place them; each spin piece is moved in from spawn with its
// inputs written out (how it gets into the slot), then its lines clear before the
// next setup
var answer_timers = []
function stop_answer(){
    answer_timers.forEach(clearTimeout)
    answer_timers = []
    Record.showing = false
}

function show_ans(){
    if (Record.showing) return
    Record.showing = true
    Record.answer_starting = true
    play()
    Record.answer_starting = false
    game.tetramino = 'G'   // hide the falling piece while replaying
    render()
    var steps = []
    for (var spin of Record.spins){
        for (var p of [...spin.build].reverse()) steps.push(p)
        steps.push({piece: spin.piece, cells: spin.cells, spin: spin})
    }
    var later = (delay, action) => answer_timers.push(setTimeout(action, delay))
    var place = step => { for (var [col, row] of step.cells) game.board[row][col] = step.piece }
    var clear_lines = () => {
        var rows = game.board.filter(row => row.some(c => c == 'N'))
        while (rows.length < 20) rows.push(Array(10).fill('N'))
        game.board = rows
    }
    var next = 0
    var run = () => {
        if (next == steps.length){
            later(1500, () => {
                stop_answer()
                retry()
                document.getElementById('spin_message').textContent = ''
            })
            return
        }
        var step = steps[next++]
        if (!step.spin){
            later(600, () => { place(step); render(); run() })
            return
        }
        // the spin piece: its inputs one by one, then the lines clear
        var path = input_path(game.board, step.piece, step.cells) || []
        // the inputs are written out only with the "Show the inputs" option
        var name = spin_name(step.spin), inputs = Config.answer_inputs
        var say = text => set_spin_text(document.getElementById('spin_message'), text)
        later(700, () => {
            game.tetramino = step.piece
            game.x = 4; game.y = 18; game.orientation = 0
            render()
            show_spin_message(inputs? name + ': from spawn': name)
        })
        var done = []
        path.forEach((move, i) => later(700 + 450 * (i + 1), () => {
            game.x = move.x; game.y = move.y; game.orientation = move.orientation
            done.push(MOVE_LABELS[move.move])
            render()
            if (inputs) say(name + ': ' + done.join(' '))
        }))
        later(700 + 450 * path.length + 700, () => {
            game.tetramino = 'G'
            place(step)
            render()
            say((inputs? name + ': ' + done.join(' '): name) + '  ✓')
        })
        later(700 + 450 * path.length + 1900, () => { clear_lines(); render(); run() })
    }
    run()
}

/*
5. start
*/
// (not in the background planner, which only needs the generator)
if (typeof PLANNER == 'undefined'){
    set_event_listener()
    load_setting()
    load_gamemode()
    update_keybind()
    board.focus()
    play_a_map()
    render()
}
