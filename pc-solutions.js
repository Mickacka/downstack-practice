// PC Solutions (pc-solutions.html): learn every solution of a perfect clear setup, the
// most useful first. Learn in order: a solution is drawn on the board for a first bag
// (study), then bags it's the answer for come one after another until you solve
// enough of them in a row from memory; then the next solution. Mixed bags: any bag,
// find which solution it takes. The solutions are in pc-solutions-data.js.

var game = new Game()
var Config = {'das':100, 'arr':0, 'delay':0, 'pressing_left':false, 'pressing_right': false, 'pressing_down': false, 'pressing':{},
    'auto_next_ind': true, 'mode': 'learn', 'no_of_trial': 0, 'no_of_success': 0,
    'setup': 'sdpc', 'rot': 'r180', 'need': 3, 'learned_only': true}
// (scalar fields, so Undo restores them; rowmap and placed are JSON)
var Record = {bag: '', target: -1, focus: -1, peek: false, study: false, clean: true,
    rowmap: '[]', placed: '[]', answered: false}
const PC_PIECES = 6

function load_json(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key)) || fallback }
    catch(err){ return fallback }
}
function save_json(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)) } catch(err){}
}

/*
1. The setups: solutions as pieces, and which solution each bag takes
*/
const current_setup = () => PC_SETUPS.find(s => s.id == Config.setup) || PC_SETUPS[0]
const current_variant = () => current_setup().variants[Config.rot]
const field_height = () => current_setup().field.length

// a solution's pieces: {piece, cells: [[col, row from the bottom]], key}
function solution_pieces(sol){
    var H = sol.grid.length, pieces = {}
    sol.grid.forEach((line, i) => [...line].forEach((c, col) => {
        if (c == 'G' || c == '.') return
        ;(pieces[c] = pieces[c] || []).push([col, H - 1 - i])
    }))
    return Object.entries(pieces).map(([p, cells]) => ({piece: p, cells: cells, key: piece_key(p, cells)}))
}
const piece_key = (p, cells) => p + ':' + cells.map(c => c.join(',')).sort().join(' ')

function permutations(list){
    if (list.length <= 1) return [list]
    var out = []
    list.forEach((x, i) => permutations(list.slice(0, i).concat(list.slice(i + 1))).forEach(p => out.push([x].concat(p))))
    return out
}
const ALL_BAGS = permutations([...'IJLOSTZ']).map(p => p.join(''))

// The ways to play n pieces of a queue with hold (empty at first, once per piece):
// {order: the pieces in the order they go down, steps: what to do}
function hold_orders(queue, n){
    var out = []
    var go = (cur, next, hold, order, steps, held) => {
        if (order.length == n){ out.push({order: order, steps: steps}); return }
        if (!cur) return
        go(next < queue.length? queue[next]: '', next + 1, hold, order + cur, steps.concat([cur]), false)
        if (held) return
        if (!hold){ if (next < queue.length) go(queue[next], next + 1, cur, order, steps.concat(['hold ' + cur]), true) }
        else go(hold, next, cur, order, steps.concat(['hold ' + cur]), true)
    }
    go(queue[0], 1, '', '', [], false)
    return out
}

// per setup and rotations: the solutions' pieces and orders, and for each bag the
// first solution (in learning order) that solves it. That takes a moment, so it's
// kept in the browser: one letter per bag (A the first solution, - none), redone
// only when the solutions change.
var tables = {}
function table(){
    var id = Config.setup + ':' + Config.rot
    if (tables[id]) return tables[id]
    var sols = current_variant().solutions
    var t = {pieces: sols.map(solution_pieces), orders: sols.map(s => new Set(s.orders.split(' '))),
        tsd: sols.map(s => new Set((s.tsd || '').split(' '))), tss: sols.map(s => new Set((s.tss || '').split(' '))),
        first: {}, bags: sols.map(() => [])}
    var version = sols.map(s => s.orders.length).join('.'), saved = load_json('pc_solutions_bags', {})
    var code = saved[id] && saved[id].v == version? saved[id].first: null
    if (!code){
        code = ALL_BAGS.map(bag => {
            var ways = hold_orders(bag, PC_PIECES).map(w => w.order)
            var k = t.orders.findIndex(orders => ways.some(o => orders.has(o)))
            return k < 0? '-': String.fromCharCode(65 + k)
        }).join('')
        saved[id] = {v: version, first: code}
        save_json('pc_solutions_bags', saved)
    }
    ALL_BAGS.forEach((bag, i) => {
        var k = code[i] == '-'? -1: code.charCodeAt(i) - 65
        t.first[bag] = k
        if (k >= 0) t.bags[k].push(bag)
    })
    return tables[id] = t
}

// How to play a bag with a solution: the hold steps, a T-spin double first if it can
function answer_for(bag, k){
    var t = table(), best = null
    for (var w of hold_orders(bag, PC_PIECES)){
        if (!t.orders[k].has(w.order)) continue
        var score = t.tsd[k].has(w.order)? 2: t.tss[k].has(w.order)? 1: 0
        if (!best || score > best.score) best = {order: w.order, steps: w.steps, score: score}
    }
    return best
}

/*
2. Progress: per setup and rotations, per solution {w: wins, t: tries, s: wins in a
row from memory, done}
*/
function progress(){
    var all = load_json('pc_solutions', {})
    return all[Config.setup + ':' + Config.rot] || {}
}
function save_progress(p){
    var all = load_json('pc_solutions', {})
    all[Config.setup + ':' + Config.rot] = p
    save_json('pc_solutions', all)
}
const learned = k => !!(progress()[k] || {}).done
// the solution being learned: the one picked, or the first not learned yet
function learning_now(){
    if (Record.focus >= 0) return Record.focus
    var n = current_variant().solutions.length
    for (var k=0; k<n; k++) if (!learned(k)) return k
    return -1
}

/*
3. Playing: a bag, the field, and where the field's rows are now (after clears)
*/
function new_bag(){
    var t = table()
    if (Config.mode == 'learn'){
        var k = learning_now()
        if (k < 0){
            // everything learned: mixed bags from now on
            flash_result(true, 'Every solution learned!')
            Config.mode = 'mixed'
            set_mode_button()
            return new_bag()
        }
        var p = progress()[k] || {}
        Record.target = k
        // the first bag of a solution (and after a miss) is studied: drawn on the board
        Record.study = !p.studied
        var list = t.bags[k]
        Record.bag = list[Math.floor(Math.random() * list.length)]
    }
    else{
        var allowed = new Set()
        if (Config.learned_only) current_variant().solutions.forEach((s, k) => { if (learned(k)) allowed.add(k) })
        var list = ALL_BAGS.filter(b => t.first[b] >= 0 && (!allowed.size || allowed.has(t.first[b])))
        Record.bag = list[Math.floor(Math.random() * list.length)]
        Record.target = t.first[Record.bag]
        Record.study = false
    }
    Record.clean = !Record.study
    Record.peek = false
    Record.answered = false
}

function play(){
    stop_replay()
    game = new Game()
    var field = current_setup().field, H = field.length
    field.forEach((line, i) => [...line].forEach((c, col) => { if (c != '.') game.board[H - 1 - i][col] = 'G' }))
    // the bag, then the next one (as in a game)
    game.bag = [...Record.bag].concat(shuffle([...'IJLOSTZ']))
    game.update()
    Record.rowmap = JSON.stringify([...Array(H).keys()])
    Record.placed = '[]'
    show_target()
    render()
}

function play_a_map(){
    new_bag()
    play()
}
function next_bag(){
    // skipping a bag being learned counts as a miss for the streak
    if (Config.mode == 'learn' && game.total_piece > 0) miss_streak()
    play_a_map()
}

function play_learn(){
    Config.mode = 'learn'
    Record.focus = -1
    play_a_map()
}
function play_mixed(){
    Config.mode = 'mixed'
    Record.focus = -1
    play_a_map()
}
// Practise one solution (a card's button): learn mode, on that one
function practise(k){
    Config.mode = 'learn'
    set_mode_button()
    Record.focus = k
    var p = progress()
    if (p[k]) p[k].studied = false
    save_progress(p)
    play_a_map()
    board.focus()
    document.getElementById('tetris').scrollIntoView({behavior: 'smooth', block: 'center'})
}

function set_mode_button(){
    var buttons = document.querySelectorAll('#rightpanel .mode-switch .game_button')
    buttons.forEach(b => {
        var on = (b.getAttribute('onclick') || '').startsWith(Config.mode == 'learn'? 'play_learn': 'play_mixed')
        b.classList.toggle('active', on)
        b.setAttribute('aria-pressed', on)
    })
}

function toggle_peek(){
    if (Record.study) return
    Record.peek = !Record.peek
    if (Record.peek) Record.clean = false
    show_target()
    render()
}

/*
4. Each piece: where it went in the field's rows, then win or miss
*/
Controls.harddrop = () => {
    var H = field_height()
    var g = new Game()
    g.board = game.board
    g.tetramino = game.tetramino
    g.x = game.x; g.y = game.y; g.orientation = game.orientation
    g.drop()
    var cells = g.to_shape(), piece = game.tetramino
    // the rows this piece fills up
    var b = game.board.map(row => [...row])
    for (var [c, r] of cells) b[r][c] = piece
    var full = []
    for (var r=0; r<20; r++) if (b[r].every(x => x != 'N')) full.push(r)
    var rowmap = JSON.parse(Record.rowmap), placed = JSON.parse(Record.placed)
    placed.push(piece_key(piece, cells.map(([c, r]) => [c, r < rowmap.length? rowmap[r]: H + r])))
    Record.rowmap = JSON.stringify(rowmap.filter((x, i) => !full.includes(i)))
    Record.placed = JSON.stringify(placed)
    game.harddrop()
    play_sound()
    detect_win()
}

function detect_win(){
    if (game.total_piece == 1) Config.no_of_trial += 1
    if (game.is_pc()) return win()
    // the empty cells under the top of the stack must be the pieces left, exactly
    var top = game.get_max_height() + 1, empty = 0
    for (var r=0; r<top; r++) for (var c=0; c<10; c++) if (game.board[r][c] == 'N') empty++
    if (empty != 4 * (PC_PIECES - game.total_piece)) miss()
}

// which solution the player's pieces make, or -1
function used_solution(){
    var placed = new Set(JSON.parse(Record.placed))
    return table().pieces.findIndex(list => list.length == placed.size && list.every(p => placed.has(p.key)))
}

function win(){
    Config.no_of_success += 1
    var k = Record.target, used = used_solution(), p = progress(), text = ''
    var counted = Config.mode == 'learn' && used == k
    if (Config.mode == 'learn'){
        var e = p[k] = p[k] || {w: 0, t: 0, s: 0}
        e.t++
        if (used == k){
            e.w++
            if (Record.study) e.studied = true
            else if (Record.clean){
                e.s++
                if (e.s >= Config.need && !e.done){
                    e.done = true
                    text = 'Solution ' + (k + 1) + ' learned!'
                    if (Record.focus == k) Record.focus = -1
                }
            }
        }
        else text = used >= 0? 'A PC, with solution ' + (used + 1) + ': practise ' + (k + 1): 'A PC, but not with solution ' + (k + 1)
        save_progress(p)
    }
    else text = used == k? 'Solution ' + (k + 1): used >= 0? 'Solution ' + (used + 1) + ' (or ' + (k + 1) + ')': 'Solution ' + (k + 1) + ' works too'
    if (!text && Config.mode == 'learn') text = Record.study? 'Now from memory': (p[k].s + ' of ' + Config.need + ' in a row')
    report_result(true, text)
    show_list()
    play_a_map()
}

function miss_streak(){
    if (Config.mode != 'learn' || Record.target < 0) return
    var p = progress(), e = p[Record.target] = p[Record.target] || {w: 0, t: 0, s: 0}
    e.t++
    e.s = 0
    // study it again on the next bag
    e.studied = false
    save_progress(p)
}

function miss(){
    miss_streak()
    Record.clean = false
    report_result(false, 'No PC from here: try again')
    show_list()
    retry()
    // a retry of a bag being learned shows the solution
    if (Config.mode == 'learn'){ Record.peek = true; show_target(); render() }
}

/*
5. Showing the solution: drawn on the board (study, peek), and Show Answer
*/
// the solution's pieces not placed yet, where they are now (rows cleared since moved)
Controls.draw_overlay = (ctx, x0, y0) => {
    if (!(Record.study || Record.peek) || Record.target < 0 || answer_replay.running) return
    var rowmap = JSON.parse(Record.rowmap), placed = new Set(JSON.parse(Record.placed))
    ctx.save()
    for (var p of table().pieces[Record.target]){
        if (placed.has(p.key)) continue
        ctx.globalAlpha = 0.45
        ctx.fillStyle = color_table[p.piece]
        for (var [c, r] of p.cells){
            var now = rowmap.indexOf(r)
            if (now < 0) continue
            ctx.fillRect(c * 30 + x0 + 3, (19 - now) * 30 + y0 + 3, 24, 24)
        }
    }
    ctx.restore()
}

function show_ans(){
    if (answer_replay.running || Record.target < 0) return
    var answer = answer_for(Record.bag, Record.target)
    if (!answer) return
    Record.clean = false
    Record.answered = true
    if (Config.mode == 'learn') miss_streak()
    // from the start: each piece where it goes, rows clearing as in the game
    play()
    Record.answered = true
    show_steps(answer.steps)
    answer_replay.running = true
    var H = field_height(), b = clone(game.board), rowmap = [...Array(H).keys()]
    var pieces = table().pieces[Record.target], frames = []
    for (var piece of answer.order){
        var p = pieces.find(x => x.piece == piece)
        for (var [c, r] of p.cells) b[rowmap.indexOf(r)][c] = piece
        frames.push(clone(b))
        var full = []
        for (var r=0; r<20; r++) if (b[r].every(x => x != 'N')) full.push(r)
        if (full.length){
            b = b.filter((row, i) => !full.includes(i))
            while (b.length < 20) b.push(Array(10).fill('N'))
            rowmap = rowmap.filter((x, i) => !full.includes(i))
            frames.push(clone(b))
        }
    }
    var replay_game = game
    frames.forEach((frame, i) => answer_replay.timers.push(setTimeout(() => {
        if (game !== replay_game) return stop_replay()
        game.board = clone(frame)
        game.tetramino = 'G'
        render()
    }, 700 * (i + 1))))
    answer_replay.timers.push(setTimeout(() => {
        var same = game === replay_game
        stop_replay()
        if (same){ play(); show_steps(answer.steps); Record.peek = true; show_target(); render() }
    }, 700 * frames.length + 1500))
}

function show_steps(steps){
    document.getElementById('pcs_steps').textContent = steps? 'Order: ' + steps.join(', '): ''
}

/*
6. Text: the goal, the list of solutions
*/
function show_target(){
    var sols = current_variant().solutions, k = Record.target
    var target = document.getElementById('pcs_target'), phase = document.getElementById('pcs_phase')
    if (!Record.answered) show_steps(null)
    var peek = document.getElementById('peek_button')
    if (peek){
        peek.textContent = Record.peek? 'Hide': 'Peek'
        peek.disabled = Record.study
    }
    if (k < 0){ target.textContent = ''; phase.textContent = ''; return }
    var s = sols[k], spin = s.tsd? ' · T-spin double': s.tss? ' · T-spin single': ''
    if (Config.mode == 'learn'){
        target.textContent = 'Solution ' + (k + 1) + ' of ' + sols.length + ': ' + pct(s.share) + ' of bags' + spin
        var e = progress()[k] || {}
        phase.textContent = Record.study? 'Study: the solution is drawn on the board'
            : 'From memory: ' + (e.s || 0) + ' of ' + Config.need + ' in a row' + (e.done? ' (learned)': '')
    }
    else{
        target.textContent = 'Mixed bags: which solution?'
        phase.textContent = Record.peek? 'Solution ' + (k + 1): ''
    }
}

// (two decimals under 1%)
const pct = x => (x > 0 && x < 0.01? (Math.round(x * 10000) / 100): Math.round(x * 1000) / 10) + '%'
// the piece of the bag a solution doesn't use
const left_out = sol => [...'IJLOSTZ'].find(p => !sol.grid.some(line => line.includes(p)))

// a little picture of a board, top row first ('.' empty, G field, P the spin's T)
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
        ctx.fillStyle = c == 'G'? '#8a8d93': c == 'P'? color_table.T: color_table[c]
        ctx.fillRect(col * size, i * size, size - 1, size - 1)
    }))
}

function show_list(){
    var setup = current_setup(), v = current_variant(), sols = v.solutions, p = progress()
    document.getElementById('pcs_title').textContent = setup.name + ': every perfect clear'
    document.getElementById('pcs_text').textContent = setup.text
    var known = sols.map((s, k) => k).filter(k => learned(k))
    var cover = 0
    for (var bag of ALL_BAGS) if (table().first[bag] >= 0 && known.includes(table().first[bag])) cover++
    var facts = [['Bags with a PC', pct(v.solvable)], ['Solutions to learn', sols.length],
        ['First two solutions', pct(sols[Math.min(1, sols.length - 1)].total)], ['You know', known.length + ' of ' + sols.length],
        ['Bags you can solve', pct(cover / ALL_BAGS.length)]]
    var box = document.getElementById('pcs_facts')
    box.textContent = ''
    for (var [label, value] of facts){
        var card = document.createElement('div')
        card.className = 'stat-card'
        card.innerHTML = '<span class="stat-label"></span><strong class="stat-value"></strong>'
        card.querySelector('.stat-label').textContent = label
        card.querySelector('.stat-value').textContent = value
        box.appendChild(card)
    }
    var build = document.getElementById('pcs_build')
    build.textContent = ''
    for (var step of setup.build.concat([{label: 'Bag 3: the perfect clear', rows: setup.field}])){
        var fig = document.createElement('figure')
        var canvas = document.createElement('canvas')
        draw_grid(canvas, step.rows, 12)
        var cap = document.createElement('figcaption')
        cap.textContent = step.label
        fig.append(canvas, cap)
        build.appendChild(fig)
    }
    var grid = document.getElementById('pcs_grid'), now = Config.mode == 'learn'? Record.target: -1
    grid.textContent = ''
    sols.forEach((s, k) => {
        var card = document.createElement('div')
        card.className = 'pro-card pcs-card' + (k == now? ' current': '')
        var title = document.createElement('span')
        title.className = 'pro-label'
        title.textContent = 'Solution ' + (k + 1) + (s.tsd? ' · TSD': s.tss? ' · TSS': '')
        var spare = document.createElement('span')
        spare.className = 'pro-who'
        spare.textContent = 'Leaves the ' + left_out(s) + ' (in hold or next)'
        var canvas = document.createElement('canvas')
        draw_grid(canvas, s.grid, 13)
        var share = document.createElement('span')
        share.className = 'pro-who'
        share.textContent = pct(s.share) + ' of bags · ' + pct(s.total) + ' in all'
        var alone = document.createElement('span')
        alone.className = 'pro-who'
        alone.textContent = 'Solves ' + pct(s.alone) + ' on its own'
        card.append(title, canvas, spare, share, alone)
        var e = p[k]
        var mine = document.createElement('span')
        mine.className = 'pro-result ' + (e && e.done? 'won': '')
        mine.textContent = e && e.done? 'Learned ✓': e && e.t? (e.s || 0) + ' of ' + Config.need + ' in a row · ' + e.w + '/' + e.t: 'Not practised'
        card.appendChild(mine)
        var button = document.createElement('button')
        button.type = 'button'
        button.className = 'install-button'
        button.textContent = 'Practise'
        button.onclick = () => practise(k)
        card.appendChild(button)
        grid.appendChild(card)
    })
}

/*
7. Options
*/
function load_options(){
    var saved = load_json('pc_solutions_config', {})
    for (var key of ['setup', 'rot', 'need', 'learned_only']) if (key in saved) Config[key] = saved[key]
    if (!PC_SETUPS.some(s => s.id == Config.setup)) Config.setup = PC_SETUPS[0].id
    var select = document.getElementById('pcs_setup')
    select.textContent = ''
    for (var s of PC_SETUPS){
        var option = document.createElement('option')
        option.value = s.id
        option.textContent = s.name
        select.appendChild(option)
    }
    select.value = Config.setup
    document.getElementById('pcs_rot').value = Config.rot
    document.getElementById('pcs_need').value = String(Config.need)
    document.getElementById('pcs_learned_only').checked = Config.learned_only
}
Controls.bind_options = () => {
    var save = () => {
        Config.setup = document.getElementById('pcs_setup').value
        Config.rot = document.getElementById('pcs_rot').value
        Config.need = parseInt(document.getElementById('pcs_need').value)
        Config.learned_only = document.getElementById('pcs_learned_only').checked
        save_json('pc_solutions_config', {setup: Config.setup, rot: Config.rot, need: Config.need, learned_only: Config.learned_only})
        Record.focus = -1
        play_a_map()
        show_list()
    }
    for (var id of ['pcs_setup', 'pcs_rot', 'pcs_need', 'pcs_learned_only']) document.getElementById(id).onchange = save
}

/*
8. Start
*/
load_options()
set_event_listener()
load_setting()
update_keybind()
board.focus()
play_learn()
show_list()
render()
