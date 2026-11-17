// All-Spin Setups (allspin-setups.html): the setups of an all-spin catalog, each a
// board and the queues that spin in it. A queue starts one piece away from the setup:
// its first piece (in brackets) builds it, going down anywhere; then every piece has to
// spin (its last move a rotation, then it can't move left, right or up), clearing lines
// when the answer does. The setups and a way to play each queue are in
// allspin-setups-data.js.

var game = new Game()
var Config = {'das':100, 'arr':0, 'delay':0, 'pressing_left':false, 'pressing_right': false, 'pressing_down': false, 'pressing':{},
    'auto_next_ind': true, 'no_of_trial': 0, 'no_of_success': 0,
    'catalog': 'all', 'order': 'next', 'with180': true}
// (scalar fields, so Undo restores them)
var Record = {setup: 0, queue: 0, placed: 0, miss: '', solved: false, peek: false, answered: false}
const LINE_NAMES = ['', 'Single', 'Double', 'Triple', 'Quad']

function load_json(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key)) || fallback }
    catch(err){ return fallback }
}
function save_json(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)) } catch(err){}
}

/*
1. The setups and queues to play: the catalog picked, without the 180° ones if off
*/
const current = () => ALLSPIN_SETUPS[Record.setup]
const current_queue = () => current().queues[Record.queue]
const queue_key = (s, q) => s.id + ':' + q.pieces
// every [setup, queue] in the catalog picked, in the fumen's order
function playable(){
    var out = []
    ALLSPIN_SETUPS.forEach((s, k) => {
        if (Config.catalog != 'all' && s.catalog != Config.catalog) return
        s.queues.forEach((q, j) => { if (Config.with180 || !q.r180) out.push([k, j]) })
    })
    return out
}

// the board a queue starts from: one piece away from the setup (the picture without
// its last piece), or the picture when it's already the setup
function start_board(s, q){
    var rows = q.start || s.rows
    var b = Array.from({length: 20}, () => Array(10).fill('N')), H = rows.length
    rows.forEach((line, i) => [...line].forEach((c, col) => {
        if (c != '.') b[H - 1 - i][col] = c
    }))
    return b
}

/*
2. Progress: per queue {w: solved, t: tries}
*/
function progress(){ return load_json('allspin_setups', {}) }
function count(won){
    var p = progress(), key = queue_key(current(), current_queue())
    var e = p[key] = p[key] || {w: 0, t: 0}
    e.t++
    if (won) e.w++
    save_json('allspin_setups', p)
}

/*
3. Playing
*/
function play(){
    stop_answer()
    game = new Game()
    var s = current(), q = current_queue()
    game.board = start_board(s, q)
    // the queue, then nothing (G: no piece)
    game.bag = [...q.pieces].concat(Array(14).fill('G'))
    game.holdmino = ''
    game.update()
    Record.placed = 0
    Record.miss = ''
    Record.solved = false
    Record.answered = false
    show_goal()
    render()
}

function go_to(k, j){
    Record.setup = k
    Record.queue = j
    Record.peek = false
    play()
    show_list()
}

// Next: the one after in the fumen's order, or any at random
function next_queue(){
    var list = playable()
    if (!list.length) return
    var i = list.findIndex(([k, j]) => k == Record.setup && j == Record.queue)
    var pick = Config.order == 'random'? list[Math.floor(Math.random() * list.length)]: list[(i + 1) % list.length]
    go_to(pick[0], pick[1])
}
function play_a_map(){ next_queue() }

function practise(k, j){
    go_to(k, j)
    board.focus()
    document.getElementById('tetris').scrollIntoView({behavior: 'smooth', block: 'center'})
}

// the all-spin rule: the last move a rotation, then stuck left, right and up
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

Controls.harddrop = () => {
    if (game.tetramino == 'G') return
    game.drop()
    var piece = game.tetramino, q = current_queue()
    var spin = /^[za]/.test(game.lastmove) && is_immobile()
    game.harddrop()
    var lines = game.line_clear
    // the plan clears lines with this piece: so must the player
    var step = q.plan.find((st, i) => i >= Record.placed && st.p == piece) || {}
    // the first pieces build: anywhere goes
    if (Record.placed < (q.builds || 0)){}
    else if (!spin) Record.miss = 'The ' + piece + " wasn't a spin: rotate it into its slot as its last move"
    else if (step.l && !lines) Record.miss = piece + '-Spin, but it cleared no lines'
    else flash_spin(piece + '-Spin' + (lines? ' ' + LINE_NAMES[lines]: '') + '!')
    Record.placed++
    play_sound()
    detect_win()
}

function detect_win(){
    if (game.total_piece == 1) Config.no_of_trial += 1
    // a piece that didn't spin: try again from the start
    if (Record.miss){
        if (!Record.answered) count(false)
        report_result(false, Record.miss)
        show_list()
        retry()
        return
    }
    if (Record.solved || Record.placed < current_queue().pieces.length) return
    Record.solved = true
    if (!Record.answered){ count(true); Config.no_of_success += 1 }
    report_result(true, Record.answered? 'Now without the answer': 'All spins!')
    show_list()
    if (Config.auto_next_ind && !Record.answered) setTimeout(() => { if (Record.solved) next_queue() }, 900)
    else setTimeout(() => { if (Record.solved) retry() }, 900)
}

function flash_spin(text){
    var el = document.getElementById('spin_message')
    el.textContent = text
    clearTimeout(flash_spin.timer)
    flash_spin.timer = setTimeout(() => { el.textContent = '' }, 1500)
}

function toggle_peek(){
    Record.peek = !Record.peek
    show_goal()
    render()
}

/*
4. The answer: drawn (Peek), and played out (Show Answer)
*/
// Peek: the next piece of the answer, while the board is the answer's so far
function answer_board(n){
    var s = current(), q = current_queue(), b = start_board(s, q)
    for (var st of q.plan.slice(0, n)){
        for (var [c, r] of st.c) b[r][c] = st.p
        b = b.filter(row => row.some(x => x == 'N'))
        while (b.length < 20) b.push(Array(10).fill('N'))
    }
    return b
}
const filled = b => b.map(row => row.map(c => c == 'N'? '.': '#').join('')).join('/')
Controls.draw_overlay = (ctx, x0, y0) => {
    if (!Record.peek || answer.running) return
    var q = current_queue(), st = q.plan[Record.placed]
    if (!st || filled(answer_board(Record.placed)) != filled(game.board)) return
    ctx.save()
    ctx.globalAlpha = 0.45
    ctx.fillStyle = color_table[st.p]
    for (var [c, r] of st.c) ctx.fillRect(c * 30 + x0 + 3, (19 - r) * 30 + y0 + 3, 24, 24)
    ctx.restore()
}

var answer = {timers: [], running: false}
function stop_answer(){
    answer.timers.forEach(clearTimeout)
    answer = {timers: [], running: false}
}

const MOVES = {'←': g => g.move_left(), '→': g => g.move_right(), '↺': g => g.rotate_anticlockwise(), '↻': g => g.rotate_clockwise(),
    '180': g => g.rotate_180('srs+'), '↓1': g => g.drop(1), '↓': g => g.drop()}
// the inputs as written: one-row drops in a row as "↓×n"
function inputs_text(moves){
    var out = []
    for (var m of moves){
        var last = out[out.length - 1]
        if (m == '↓1' && last && last.startsWith('↓×')) out[out.length - 1] = '↓×' + (parseInt(last.slice(2)) + 1)
        else out.push(m == '↓1'? '↓×1': m)
    }
    return out.join(' ')
}

function show_ans(){
    if (answer.running) return
    var q = current_queue()
    play()
    Record.answered = true
    answer.running = true
    var later = (delay, action) => answer.timers.push(setTimeout(action, delay))
    var replay_game = game, t = 300, lines = []
    var say = () => { document.getElementById('as_steps').textContent = lines.join(' · ') }
    game.bag = ['G'].concat(Array(14).fill('G'))
    game.tetramino = 'G'
    render()
    q.plan.forEach(st => {
        var moves = st.m? st.m.split(' '): []
        var g = new Game()
        later(t, () => {
            if (game !== replay_game) return
            g.board = game.board
            g.tetramino = st.p
            g.x = 4; g.y = 18; g.orientation = 0
            game.tetramino = st.p; game.x = 4; game.y = 18; game.orientation = 0
            render()
        })
        moves.forEach((m, i) => later(t + 400 * (i + 1), () => {
            if (game !== replay_game) return
            MOVES[m](g)
            game.x = g.x; game.y = g.y; game.orientation = g.orientation
            render()
        }))
        t += 400 * (moves.length + 1)
        later(t, () => {
            if (game !== replay_game) return
            for (var [c, r] of st.c) game.board[r][c] = st.p
            game.tetramino = 'G'
            render()
            lines.push(st.p + (q.plan.indexOf(st) < (q.builds || 0)? ' (builds)': '') + ': ' + (inputs_text(moves) || 'hard drop'))
            say()
        })
        t += 600
        later(t, () => {
            if (game !== replay_game) return
            var rows = game.board.filter(row => row.some(c => c == 'N'))
            while (rows.length < 20) rows.push(Array(10).fill('N'))
            game.board = rows
            render()
        })
        t += 500
    })
    later(t + 1200, () => {
        var same = game === replay_game
        stop_answer()
        if (same){ play(); Record.answered = true; say() }
    })
}

/*
5. Text: the goal, the list of setups
*/
function show_goal(){
    var s = current(), q = current_queue()
    var parts = [...q.pieces].map((p, i) => i < (q.builds || 0)? p + ' (builds)': p + '-Spin')
    document.getElementById('as_goal').textContent = parts.join(' → ')
    document.getElementById('as_where').textContent = s.catalog + ' · setup ' + (ALLSPIN_SETUPS.indexOf(s) + 1) + ' of ' + ALLSPIN_SETUPS.length +
        (q.r180? ' · needs a 180°': '') + (q.builds? ' · build the setup, then spin': ' · the setup is built: spin')
    var e = progress()[queue_key(s, q)]
    document.getElementById('as_score').textContent = e? 'Solved ' + e.w + ' of ' + e.t: 'Not tried yet'
    if (!answer.running && !Record.answered) document.getElementById('as_steps').textContent = ''
    var peek = document.getElementById('peek_button')
    if (peek) peek.textContent = Record.peek? 'Hide': 'Peek'
    var kicks = document.getElementById('as_kicks')
    if (kicks) kicks.hidden = !(q.r180 && kick_180_setting() != 'srs+')
}

// a little picture of a board, top row first ('.' empty, G gray)
function draw_grid(canvas, rows, size){
    var dpr = Math.min(window.devicePixelRatio || 1, 3), w = 10 * size, h = rows.length * size
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    var ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    rows.forEach((line, i) => [...line].forEach((c, col) => {
        if (c == '.') return
        ctx.fillStyle = c == 'G'? '#8a8d93': color_table[c]
        ctx.fillRect(col * size, i * size, size - 1, size - 1)
    }))
}

function show_list(){
    var box = document.getElementById('as_list'), p = progress()
    box.textContent = ''
    var heading = null, grid = null
    var total = 0, solved = 0
    ALLSPIN_SETUPS.forEach((s, k) => {
        if (Config.catalog != 'all' && s.catalog != Config.catalog) return
        if (s.catalog != heading){
            heading = s.catalog
            var h = document.createElement('h3')
            h.textContent = heading
            grid = document.createElement('div')
            grid.className = 'pro-grid as-grid'
            box.append(h, grid)
        }
        var card = document.createElement('div')
        card.className = 'pro-card as-card' + (k == Record.setup? ' current': '')
        var title = document.createElement('span')
        title.className = 'pro-label'
        title.textContent = 'Setup ' + (k + 1)
        var canvas = document.createElement('canvas')
        draw_grid(canvas, s.rows, 12)
        var note = document.createElement('span')
        note.className = 'pro-who'
        note.textContent = 'Fumen: ' + s.comment
        card.append(title, canvas, note)
        var buttons = document.createElement('div')
        buttons.className = 'shape-buttons'
        s.queues.forEach((q, j) => {
            var e = p[queue_key(s, q)], button = document.createElement('button')
            button.type = 'button'
            button.className = 'install-button' + (e && e.w? ' done': '')
            var n = q.builds || 0
            button.textContent = (n? '(' + q.pieces.slice(0, n) + ')': '') + q.pieces.slice(n) + (q.r180? ' 180°': '') + (e && e.w? ' ✓': '')
            button.title = (n? [...q.pieces.slice(0, n)].join(', ') + ' build' + (n == 1? 's': '') + ', then ': '') + [...q.pieces.slice(n)].join(', ') + ' spin' +
                (e? ' · solved ' + e.w + ' of ' + e.t: '')
            button.onclick = () => practise(k, j)
            buttons.appendChild(button)
            if (Config.with180 || !q.r180){ total++; if (e && e.w) solved++ }
        })
        card.appendChild(buttons)
        grid.appendChild(card)
    })
    document.getElementById('as_count').textContent = solved + ' of ' + total + ' queues solved'
}

/*
6. Options
*/
function load_options(){
    var saved = load_json('allspin_setups_config', {})
    for (var key of ['catalog', 'order', 'with180']) if (key in saved) Config[key] = saved[key]
    var select = document.getElementById('as_catalog')
    for (var name of [...new Set(ALLSPIN_SETUPS.map(s => s.catalog))]){
        var option = document.createElement('option')
        option.value = option.textContent = name
        select.appendChild(option)
    }
    select.value = Config.catalog
    if (select.value != Config.catalog) Config.catalog = select.value = 'all'
    document.getElementById('as_order').value = Config.order
    document.getElementById('as_180').checked = Config.with180
}
Controls.bind_options = () => {
    var save = () => {
        Config.catalog = document.getElementById('as_catalog').value
        Config.order = document.getElementById('as_order').value
        Config.with180 = document.getElementById('as_180').checked
        save_json('allspin_setups_config', {catalog: Config.catalog, order: Config.order, with180: Config.with180})
        // still in the list picked?
        var list = playable()
        if (!list.some(([k, j]) => k == Record.setup && j == Record.queue) && list.length) go_to(list[0][0], list[0][1])
        show_list()
    }
    for (var id of ['as_catalog', 'as_order', 'as_180']) document.getElementById(id).onchange = save
}

/*
7. Start: where you left off
*/
load_options()
set_event_listener()
load_setting()
update_keybind()
var start = load_json('allspin_setups_at', null), list = playable()
if (start && ALLSPIN_SETUPS[start[0]] && ALLSPIN_SETUPS[start[0]].queues[start[1]]) [Record.setup, Record.queue] = start
else if (list.length) [Record.setup, Record.queue] = list[0]
board.focus()
play()
show_list()
render()
window.addEventListener('pagehide', () => save_json('allspin_setups_at', [Record.setup, Record.queue]))
