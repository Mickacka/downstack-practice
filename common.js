// Code shared by every game page (loaded after header.js, before the page script).
// Page scripts define the globals used here: game, Config, play(), detect_win(), show_ans().

const Keybind = {'keydown':{}, 'keyup':{}}
var Customized_key = ['ArrowLeft','ArrowRight','ArrowDown','Space','KeyZ','KeyX','KeyA','ShiftLeft','KeyR','KeyP','KeyU']
// the settings input for each key above
const key_input = i => document.getElementById(i == 10? 'input_undo': 'input'+(i+1))
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

function play_sound(){
    if (game.combo >= 0){
        sound[Math.min(6,game.combo)].cloneNode().play()
    }
}

// The board is drawn in 520x610 units. The canvas backing store is scaled by the
// screen's pixel ratio so it stays sharp on phones; its size on the page is set in CSS.
function board_context(){
    var canvas = document.getElementById('board')
    var dpr = Math.min(window.devicePixelRatio || 1, 3)
    if (canvas.width != Math.round(520 * dpr)){
        canvas.width = Math.round(520 * dpr)
        canvas.height = Math.round(610 * dpr)
    }
    var ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return ctx
}

function render(){
    var ctx = board_context();
    ctx.clearRect(0,0,520,610);
    // render background and margin

    var offset_x = 110
    var offset_y = 5
    ctx.fillStyle = 'black';
    ctx.fillRect(offset_x,offset_y,300,600);
    ctx.strokeStyle = 'grey';
    ctx.strokeRect(offset_x,offset_y,300,600);
    // render grid
    for (var row=0; row<20; row++)
    for (var col=0; col<10; col++){
        ctx.strokeRect(col*30+offset_x,(19-row)*30+offset_y,30,30);
    }

    // render shodow
    var min_relative_height = 20
    for ([col, row] of game.to_shape()){
        var ground_height = 0
        for (var i=0; i<row; i++)
            if (game.board[i][col] != 'N')
                ground_height = i+1
        min_relative_height = Math.min(min_relative_height, row - ground_height)
    }
    ctx.fillStyle = 'grey';
    for ([col, row] of game.to_shape())
        ctx.fillRect(col*30+offset_x,(19-row+min_relative_height)*30+offset_y,30,30);
    // render piece
    ctx.fillStyle = color_table[game.tetramino]
    for (var [col,row] of game.to_shape()){
        ctx.fillRect(col*30+offset_x,(19-row)*30+offset_y,30,30)
    }
    // render board
    ctx.strokeStyle = 'grey';
    for (var row=0; row<20; row++)
        for (var col=0; col<10; col++){
            if (game.board[row][col] != 'N'){
                ctx.fillStyle = color_table[game.board[row][col]];
                ctx.fillRect(col*30+offset_x,(19-row)*30+offset_y,30,30);
            }
        }
    if (Controls.draw_overlay) Controls.draw_overlay(ctx, offset_x, offset_y)


    // render hold
    var offset_x = 5
    var offset_y = 5
    ctx.fillStyle = 'black';
    ctx.fillRect(offset_x,offset_y,100,100);
    ctx.strokeStyle = 'grey';
    ctx.strokeRect(offset_x,offset_y,100,100);
    if (game.holdmino != ''){
        ctx.fillStyle = color_table[game.holdmino]
        for (var [col, row] of game.to_shape(game.holdmino)){
            var piece_offset = 'IO'.includes(game.holdmino)? 10: 20;
            ctx.fillRect((col+1)*20+offset_x+piece_offset,(3-row)*20+offset_y,20,20);
        }

    }
    // render next
    var offset_x = 415
    var offset_y = 5
    ctx.fillStyle = 'black';
    ctx.fillRect(offset_x,offset_y,100,410);
    ctx.strokeStyle = 'grey';
    ctx.strokeRect(offset_x,offset_y,100,410);
    for (var piece_idx=1; piece_idx<6; piece_idx++){
        ctx.fillStyle = color_table[game.bag[piece_idx]]
        for (var [col, row] of game.to_shape(game.bag[piece_idx])){
            var piece_offset = 'IO'.includes(game.bag[piece_idx])? 10: 20;
            ctx.fillRect((col+1)*20+offset_x+piece_offset,(3-row)*20+(piece_idx-1)*80+offset_y,20,20);

        }
    }

    // render game stat
    ctx.fillStyle = 'green';
    ctx.font = "bold 20px Arial ";
    if (game.line_clear>0 && game.line_clear<4 && game.b2b>=0)ctx.fillText('TSPIN',10,150)
    if (game.line_clear>0)ctx.fillText(['','Single','Double','Triple','Quad'][game.line_clear],10,200)
    if (game.combo > 0) ctx.fillText(game.combo+' Combo',10,300)
    if (game.pc) ctx.fillText('All Clear',10,350)

    // this session, then all-time for this mode
    ctx.fillText('Trial:',420,450)
    ctx.fillText(Config.no_of_success+'/'+Config.no_of_trial,420,470)
    var stats = load_stats()
    ctx.font = "bold 14px Arial ";
    ctx.fillText('All time '+stats.solved+'/'+stats.tries,420,500)
    ctx.fillText('Streak '+stats.streak,420,520)
    ctx.fillText('Best '+stats.best,420,540)
    draw_finesse(ctx)
    draw_daily(ctx)
    draw_rush(ctx)

}

function press_left(first_call = false){

    if (first_call && !Config.pressing_left){
        Config.timer1 = new Date().getTime();
        Config.delay = Config.das;
        game.move_left()
        render();
        Config.pressing_left = true;
        Config.pressing_right = false;
        setTimeout(press_left, 1)
    }

    else if (!first_call && Config.pressing_left){
        var now = new Date().getTime()
        if (now - Config.timer1 > Config.delay){
            Config.arr===0? game.move_leftmost(): game.move_left()
            render();
            Config.delay = Config.arr
            Config.timer1 = now
        }
        setTimeout(press_left, 1)
    }
}

function release_left(){
    Config.pressing_left = false;
}

function press_right(first_call = false){

    if (first_call && !Config.pressing_right){
        Config.timer2 = new Date().getTime();
        Config.delay = Config.das;
        game.move_right()
        render();
        Config.pressing_right = true;
        Config.pressing_left = false;
        setTimeout(press_right, 1)
    }

    else if (!first_call && Config.pressing_right){
        var now = new Date().getTime()
        if (now - Config.timer2 > Config.delay){
            Config.arr===0? game.move_rightmost(): game.move_right()
            render();
            Config.delay = Config.arr
            Config.timer2 = now
        }
        setTimeout(press_right, 1)
    }
}

function release_right(){
    Config.pressing_right = false;
}

function press_down(first_call = false){
    if (first_call && !Config.pressing_down){
        game.softdrop()
        render();
        Config.pressing_down = true;
        setTimeout(press_down, 1)
    }
    else if (!first_call && Config.pressing_down){
        game.softdrop()
        render();
        setTimeout(press_down, 1)
    }
}

function release_down(){
    Config.pressing_down = false;
}

function add_generic_keybind(key,func){
    Keybind.keydown[key] = e=>{if (!Config.pressing[key]) func();
        render();
        Config.pressing[key] = true;
    }
    Keybind.keyup[key] = e=>{Config.pressing[key] = false}

}

function retry(){
    // in a rush, a missed puzzle moves on to a new one
    if (rush.on && rush.skip_retry){
        rush.skip_retry = false
        play_a_map()
        render()
        return
    }
    play()
    render()
}

function load_setting(){
    try{
        var storage = localStorage.getItem('Customized_key')
        if (storage!= null){
            Customized_key = JSON.parse(storage);
            if (Customized_key.length < 11) Customized_key.push('KeyU')
            Config.das = parseInt(localStorage.getItem('das'))
            if (! (Config.das>=1 && Config.das<=200)){
                Config.das = 100}
            Config.arr = parseInt(localStorage.getItem('arr'))
            if (! (Config.arr>=0 && Config.arr<=100)){
                Config.arr = 0
            }
            Config.auto_next_ind = localStorage.getItem('auto_next_ind') != 'false'

        }
    }
    catch(err){
        localStorage.clear()
        console.log('storage corrupted')
    }
    for (var i=0; i<Customized_key.length; i++){
        if (key_input(i)) key_input(i).value = Customized_key[i]
    }
    document.getElementById('input11').value = Config.das
    document.getElementById('input12').value = Config.arr
    var auto_next = document.getElementById('input12.1')
    if (auto_next) auto_next.checked = Config.auto_next_ind
    check_key_conflicts()
}

function save_setting(){
    for (var i=0; i<Customized_key.length; i++){
        if (key_input(i)) Customized_key[i] = key_input(i).value
    }
    Config.das = parseInt(document.getElementById('input11').value)
    if (! (Config.das>=1 && Config.das<=200)){
        alert('DAS should be between 1 to 200')
        Config.das = 100
    }
    Config.arr = parseInt(document.getElementById('input12').value)
    if (! (Config.arr>=0 && Config.arr<=100)){
        alert('ARR should be between 0 to 100')
        Config.arr = 0
    }

    var auto_next = document.getElementById('input12.1')
    if (auto_next) Config.auto_next_ind = auto_next.checked
    check_key_conflicts()
    update_keybind()
    localStorage.setItem('auto_next_ind', Config.auto_next_ind)
    localStorage.setItem('Customized_key',JSON.stringify(Customized_key))
    localStorage.setItem('das',Config.das)
    localStorage.setItem('arr',Config.arr)
}

// What the keys and touch buttons do. A page script can override any of these
// before set_event_listener() runs.
var Controls = {
    harddrop: () => { game.harddrop(); play_sound(); detect_win() },
    after_rotate: () => {},
    show_answer: () => show_ans(),   // null: no Show Answer key
    can_play: () => true,
    can_undo: true,                  // false: no Undo (the timed challenge)
    bind_options: () => {},          // hook up the page's own options panel
    draw_overlay: null,              // (ctx, x, y): draw over the board, whose top-left cell is at x, y
}

function update_keybind(){
    Keybind.keydown = {}
    Keybind.keyup = {}

    Keybind.keydown[Customized_key[0]] = e=>{if (!Config.pressing_left) finesse_input(); press_left(true)}
    Keybind.keyup[Customized_key[0]] = e=>{release_left(true)}

    Keybind.keydown[Customized_key[1]] = e=>{if (!Config.pressing_right) finesse_input(); press_right(true)}
    Keybind.keyup[Customized_key[1]] = e=>{release_right(true)}

    Keybind.keydown[Customized_key[2]] = e=>{finesse_soft_drop(); press_down(true)}
    Keybind.keyup[Customized_key[2]] = e=>{release_down(true)}

    add_generic_keybind(Customized_key[3], ()=> harddrop_action())
    add_generic_keybind(Customized_key[4], ()=> (finesse_input(), game.rotate_anticlockwise(), Controls.after_rotate()))
    add_generic_keybind(Customized_key[5], ()=> (finesse_input(), game.rotate_clockwise(), Controls.after_rotate()))
    add_generic_keybind(Customized_key[6], ()=> (finesse_input(), game.rotate_180(), Controls.after_rotate()))
    add_generic_keybind(Customized_key[7], ()=> game.hold())
    add_generic_keybind(Customized_key[8], ()=> retry())
    if (Controls.show_answer) add_generic_keybind(Customized_key[9], ()=> Controls.show_answer())
    if (Controls.can_undo) add_generic_keybind(Customized_key[10], ()=> undo())
}

function is_typing(){
    var tag = document.activeElement.tagName
    return tag == 'INPUT' || tag == 'TEXTAREA' || tag == 'SELECT'
}

function set_event_listener(){
    setup_panels()
    document.onkeydown = (e => {
        var func = Keybind.keydown[e.code];
        if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code) && !is_typing()){
            e.preventDefault()}
        if (document.activeElement.className == 'keybind'){
            document.activeElement.value = e.code
            save_setting()
        }
        if (!is_typing() && func != undefined && Controls.can_play() && !answer_replay.running){
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
        var ctx = board_context();
        ctx.font = "bold 40px Arial ";
        ctx.fillStyle = 'rgba(234,200,0,0.5)'
        ctx.fillText('          OUT OF FOCUS',0,300)
    })

    document.getElementById('input11').oninput = e=>{save_setting()}
    document.getElementById('input12').oninput = e=>{save_setting()}
    var auto_next = document.getElementById('input12.1')
    if (auto_next) auto_next.onchange = e=>{save_setting()}
    var gravity_select = document.getElementById('gravity')
    if (gravity_select){
        gravity_select.value = String(gravity_setting())
        gravity_select.onchange = () => {
            try{ localStorage.setItem('gravity', gravity_select.value) } catch(err){}
        }
    }
    var kick180 = document.getElementById('kick180')
    if (kick180){
        kick180.value = kick_180_setting()
        kick180.onchange = () => {
            try{ localStorage.setItem('kick180', kick180.value) } catch(err){}
        }
    }
    var finesse_toggle = document.getElementById('finesse_toggle')
    if (finesse_toggle){
        finesse_toggle.checked = finesse_enabled()
        finesse_toggle.onchange = () => {
            try{ localStorage.setItem('finesse', finesse_toggle.checked? 'on': 'off') }
            catch(err){}
            render()
        }
    }
    Controls.bind_options()
    setup_touch_controls();

    // preventDefault stops Android's long-press menu / text selection and the
    // emulated mouse click; that needs a non-passive listener
    const press = (id, func) => document.getElementById(id).addEventListener('touchstart', e => {
        e.preventDefault()
        e.currentTarget.classList.add('pressed')
        if (!Controls.can_play() || answer_replay.running) return
        func()
        render()
    }, {passive: false})
    // a held button is released on touchend, and also on touchcancel (the system
    // took over the touch), otherwise the piece would keep moving
    const release = (id, func) => {
        for (var type of ['touchend', 'touchcancel'])
            document.getElementById(id).addEventListener(type, e => {
                e.preventDefault()
                func()
                render()
            }, {passive: false})
    }
    press('tc-dr', () => (finesse_input(), game.rotate_180(), Controls.after_rotate()))
    press('tc-h', () => game.hold())
    press('tc-hd', () => harddrop_action())
    press('tc-l', () => (Config.pressing_left || finesse_input(), press_left(true)))
    release('tc-l', () => release_left(true))
    press('tc-r', () => (Config.pressing_right || finesse_input(), press_right(true)))
    release('tc-r', () => release_right(true))
    press('tc-d', () => (finesse_soft_drop(), press_down(true)))
    release('tc-d', () => release_down(true))
    press('tc-cc', () => (finesse_input(), game.rotate_anticlockwise(), Controls.after_rotate()))
    press('tc-c', () => (finesse_input(), game.rotate_clockwise(), Controls.after_rotate()))
    document.getElementById('tcc').addEventListener('contextmenu', e => e.preventDefault())
    for (var button of document.querySelectorAll('#tcc span'))
        for (var type of ['touchend', 'touchcancel'])
            button.addEventListener(type, e => e.currentTarget.classList.remove('pressed'))
}

/*
Results, stats and undo
*/

// Stats are kept per page and mode in localStorage: tries, solved, streak, best streak
function stats_key(){
    var page = location.pathname.split('/').pop() || 'index.html'
    return 'stats:' + page + ':' + (Config.mode || '')
}

// render() shows the stats on every frame, so keep the last read in memory
var stats_cache = {key: null, value: null}

function load_stats(){
    var key = stats_key()
    if (stats_cache.key != key){
        var stats = null
        try{ stats = JSON.parse(localStorage.getItem(key)) }
        catch(err){}
        stats_cache = {key: key, value: stats || {tries: 0, solved: 0, streak: 0, best: 0}}
    }
    return {...stats_cache.value}
}

function save_stats(stats){
    stats_cache = {key: stats_key(), value: stats}
    try{ localStorage.setItem(stats_cache.key, JSON.stringify(stats)) }
    catch(err){}
}

/*
Attempt history for the stats page (stats.html): one entry per finished attempt,
{t: when, p: page, m: mode, w: 1 solved / 0 missed, s: seconds since the first
input on that board, f: finesse faults}. The newest 5000 are kept.
*/
var attempt = {game: null, start: 0, faults: 0}

// called on every input: a new game object (new map or retry) is a new attempt
function attempt_track(){
    if (attempt.game !== game){
        attempt.game = game
        attempt.start = Date.now()
        attempt.faults = finesse.faults
    }
}

function log_attempt(won){
    var entry = {t: Date.now(), p: location.pathname.split('/').pop() || 'index.html', m: Config.mode || '', w: won? 1: 0}
    if (attempt.game === game){
        entry.s = Math.round((Date.now() - attempt.start) / 100) / 10
        if (finesse_enabled()) entry.f = finesse.faults - attempt.faults
    }
    try{
        var history = JSON.parse(localStorage.getItem('history')) || []
        history.push(entry)
        localStorage.setItem('history', JSON.stringify(history.slice(-5000)))
    }
    catch(err){}
}

// Every mode reports the end of an attempt here: plays the sound, flashes the
// result over the board and records it. `reason` explains a miss when known.
function report_result(won, reason){
    sound[won? 'win': 'lose'].play()
    log_attempt(won)
    var stats = load_stats()
    stats.tries += 1
    if (won){
        stats.solved += 1
        stats.streak += 1
        stats.best = Math.max(stats.best, stats.streak)
    }
    else stats.streak = 0
    save_stats(stats)
    if (won && is_daily_map()){
        daily_solved()
        if (!reason) reason = 'Daily solved'
    }
    if (rush.on){
        if (won) rush.solved += 1
        else{
            rush.missed += 1
            rush.skip_retry = true
            if (!reason) reason = 'Next puzzle'
        }
    }
    flash_result(won, reason || (won? '': 'Try again'))
}

function flash_result(won, text){
    var flash = document.getElementById('result_flash')
    if (!flash){
        flash = document.createElement('div')
        flash.id = 'result_flash'
        flash.setAttribute('role', 'status')
        document.getElementById('tetris').appendChild(flash)
    }
    flash.className = won? 'won': 'lost'
    flash.innerHTML = '<span class="mark">' + (won? '✓': '✗') + '</span>' +
        (text? '<span class="text"></span>': '')
    if (text) flash.querySelector('.text').textContent = text
    void flash.offsetWidth   // restart the animation
    flash.classList.add('show')
}

// Undo: a snapshot of the game before each hard drop
var undo_history = []

function snapshot_record(){
    // the scalar fields each mode keeps on Record (done_tsd, tsd, done_spin, ...)
    var saved = {}
    if (typeof Record == 'object')
        for (var key in Record){
            var value = Record[key]
            if (value === null || ['number', 'boolean', 'string'].includes(typeof value)) saved[key] = value
        }
    return saved
}

function take_snapshot(){
    undo_history.push({
        game: game,
        board: clone(game.board),
        bag: [...game.bag],
        holdmino: game.holdmino,
        tetramino: game.tetramino,
        fields: {total_piece: game.total_piece, combo: game.combo, b2b: game.b2b, pc: game.pc,
                 line_clear: game.line_clear, total_line_clear: game.total_line_clear},
        record: snapshot_record(),
    })
    if (undo_history.length > 50) undo_history.shift()
}

function undo(){
    // snapshots from an earlier attempt (retry or a new map made a new game) don't apply
    undo_history = undo_history.filter(s => s.game === game)
    var s = undo_history.pop()
    if (!s) return
    game.board = s.board
    game.bag = s.bag
    game.holdmino = s.holdmino
    Object.assign(game, s.fields)
    if (typeof Record == 'object') Object.assign(Record, s.record)
    game.update()
    game.tetramino = s.tetramino
    render()
}

function harddrop_action(){
    finesse_check()
    take_snapshot()
    Controls.harddrop()
}

/*
Show Answer, step by step, for the generated modes.
Record.board[k] is the solution after k+1 pieces were carved out of the finished
map: piece letters are pieces still to place, full rows are garbage they clear.
Replaying it backwards gives the player's order.
*/
var answer_replay = {timers: [], running: false}

function stop_replay(){
    answer_replay.timers.forEach(clearTimeout)
    answer_replay = {timers: [], running: false}
}

// The cells of the piece carved going from `before` to `after`. `after` is `before` with
// full garbage rows inserted, then some garbage cells turned into the new piece. Line the
// rows up (dynamic programming) so that as few cells as possible count as new: rows match
// when they are equal except for garbage that became piece; unmatched rows must be full.
function carved_cells(before, after){
    var is_piece = c => !'NG'.includes(c)
    var match_cost = (a, b) => {   // new-piece cells if after-row a is before-row b, or -1
        var cost = 0
        for (var col=0; col<10; col++){
            if (a[col] == b[col]) continue
            if (is_piece(a[col]) && b[col] == 'G') cost++
            else return -1
        }
        return cost
    }
    var INF = 1e9, n = 20
    var f = Array.from({length: n+1}, () => Array(n+1).fill(INF))
    var how = Array.from({length: n+1}, () => Array(n+1).fill(null))
    f[0][0] = 0
    for (var i=0; i<n; i++)
        for (var j=0; j<=n; j++){
            if (f[i][j] == INF) continue
            var row = after[i]
            if (j < n){
                var c = match_cost(row, before[j])
                if (c >= 0 && f[i][j] + c < f[i+1][j+1]){ f[i+1][j+1] = f[i][j] + c; how[i+1][j+1] = 'match' }
            }
            if (row.every(c => c != 'N')){
                var c2 = row.filter(is_piece).length
                if (f[i][j] + c2 < f[i+1][j]){ f[i+1][j] = f[i][j] + c2; how[i+1][j] = 'insert' }
            }
        }
    // rows of `before` pushed off the top must have been empty
    var best = -1
    for (var j=n; j>=0; j--){
        if (before.slice(j).some(r => r.some(c => c != 'N'))) break
        if (f[n][j] < INF && (best < 0 || f[n][j] < f[n][best])) best = j
    }
    if (best < 0) return []
    var cells = [], i = n, j = best
    while (i > 0){
        var row = after[i-1]
        if (how[i][j] == 'match'){
            for (var col=0; col<10; col++)
                if (is_piece(row[col]) && before[j-1][col] == 'G') cells.push([col, i-1])
            j--
        }
        else for (var col=0; col<10; col++) if (is_piece(row[col])) cells.push([col, i-1])
        i--
    }
    return cells
}

// the board the player sees: pieces still to place are empty
const strip_pieces = b => b.map(row => row.map(c => c == 'G'? 'G': 'N'))

function replay_answer(){
    if (answer_replay.running || !Record.board || Record.board.length == 0) return
    stop_replay()
    answer_replay.running = true
    var boards = Record.board
    var frames = []
    // play it forward: each frame shows the next piece where it goes; placed pieces keep
    // their colour and full rows clear, exactly as in the game
    var current = strip_pieces(boards[boards.length-1])
    for (var k=boards.length-1; k>=0; k--){
        var before = k > 0? boards[k-1]: Record.finished_map
        for (var [col, row] of carved_cells(before, boards[k])) current[row][col] = boards[k][row][col]
        frames.push(clone(current))
        current = current.filter(row => row.some(c => c == 'N'))
        while (current.length < 20) current.push(Array(10).fill('N'))
    }
    frames.push(current)
    var replay_game = game
    var show = frame => {
        // a new map or retry made a new game: stop replaying over it
        if (game !== replay_game) return stop_replay()
        game.board = clone(frame)
        game.tetramino = 'G'   // hide the falling piece while replaying
        render()
    }
    frames.forEach((frame, i) => answer_replay.timers.push(setTimeout(() => show(frame), 900 * i)))
    answer_replay.timers.push(setTimeout(() => {
        var same_game = game === replay_game
        stop_replay()
        if (same_game) retry()
    }, 900 * frames.length + 1200))
}

/*
Share a puzzle: the link carries the generated map itself (the generator's Record,
the mode's settings and the goal text), compressed into the part after #.
*/
const SHARED_CONFIG = ['mode', 'no_of_piece', 'no_of_unreserved_piece', 'blank_col', 'quad_col']

async function compress(text){
    if (!window.CompressionStream) return 'j' + btoa(unescape(encodeURIComponent(text)))
    var stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'))
    var bytes = new Uint8Array(await new Response(stream).arrayBuffer())
    var binary = ''
    for (var b of bytes) binary += String.fromCharCode(b)
    return 'z' + btoa(binary)
}

async function decompress(code){
    if (code[0] == 'j') return decodeURIComponent(escape(atob(code.slice(1))))
    var bytes = Uint8Array.from(atob(code.slice(1)), c => c.charCodeAt(0))
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    return await new Response(stream).text()
}

const to_url_safe = s => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const from_url_safe = s => s.replace(/-/g, '+').replace(/_/g, '/')

async function puzzle_url(){
    var config = {}
    for (var key of SHARED_CONFIG) if (key in Config) config[key] = Config[key]
    var requirement = document.getElementById('winning_requirement')
    var data = {record: Record, config: config, goal: requirement? requirement.innerHTML: ''}
    var code = to_url_safe(await compress(JSON.stringify(data)))
    return location.origin + location.pathname + '#p=' + code
}

async function share_link(){
    var url = await puzzle_url()
    try{
        await navigator.clipboard.writeText(url)
        flash_result(true, 'Link copied')
    }
    catch(err){
        window.prompt('Copy this link', url)
    }
    return url
}

async function load_shared_puzzle(){
    var match = location.hash.match(/^#p=(.+)$/)
    if (!match) return
    try{
        var data = JSON.parse(await decompress(from_url_safe(match[1])))
        Object.assign(Record, data.record)
        Object.assign(Config, data.config)
        var requirement = document.getElementById('winning_requirement')
        if (requirement && data.goal) requirement.innerHTML = data.goal
        retry()
        flash_result(true, 'Shared puzzle')
    }
    catch(err){
        flash_result(false, 'This puzzle link is broken')
    }
    // leave the address clean so New Map / reload don't come back to it
    history.replaceState(null, '', location.pathname)
}
window.addEventListener('load', load_shared_puzzle)

/*
Key settings: reset to defaults, and warn when two actions share a key
*/
const DEFAULT_KEYS = ['ArrowLeft','ArrowRight','ArrowDown','Space','KeyZ','KeyX','KeyA','ShiftLeft','KeyR','KeyP','KeyU']

function reset_keys(){
    Customized_key = [...DEFAULT_KEYS]
    for (var i=0; i<Customized_key.length; i++)
        if (key_input(i)) key_input(i).value = Customized_key[i]
    save_setting()
}

function check_key_conflicts(){
    var used = {}
    for (var i=0; i<Customized_key.length; i++)
        (used[Customized_key[i]] = used[Customized_key[i]] || []).push(i)
    var clashes = Object.entries(used).filter(([key, actions]) => actions.length > 1)
    for (var i=0; i<Customized_key.length; i++){
        var input = key_input(i)
        if (input) input.classList.toggle('conflict', used[Customized_key[i]].length > 1)
    }
    var message = document.getElementById('key_conflict')
    if (message) message.textContent = clashes.length
        ? clashes.map(([key]) => key).join(', ') + ' is used for more than one action. '
        : ''
}

/*
Panels: group the mode buttons into a switch that shows the active mode
*/
function setup_panels(){
    var panel = document.getElementById('rightpanel')
    if (!panel) return
    panel.querySelectorAll(':scope > br').forEach(br => br.remove())
    var buttons = [...panel.querySelectorAll(':scope > .game_button')]
        .filter(b => /^play_/.test(b.getAttribute('onclick') || ''))
    if (buttons.length < 2){
        buttons.forEach(b => b.classList.add('primary'))
        return
    }
    var group = document.createElement('div')
    group.className = 'mode-switch'
    group.setAttribute('role', 'group')
    group.setAttribute('aria-label', 'Mode')
    buttons[0].before(group)
    buttons.forEach(b => group.appendChild(b))
    var set_active = active => buttons.forEach(b => {
        b.classList.toggle('active', b === active)
        b.setAttribute('aria-pressed', b === active)
    })
    buttons.forEach(b => b.addEventListener('click', () => set_active(b)))
    // the page start and auto-next start modes by calling these functions: follow them
    // (unless two buttons share a function with different arguments)
    var names = buttons.map(b => b.getAttribute('onclick').match(/^\w+/)[0])
    names.forEach((name, i) => {
        if (names.indexOf(name) != names.lastIndexOf(name)) return
        var original = window[name]
        if (typeof original != 'function') return
        window[name] = function(){
            set_active(buttons[i])
            return original.apply(this, arguments)
        }
    })
    set_active(buttons[0])
}

/*
Finesse: compare the inputs used for each piece with the fewest that reach the
same landing spot. Moving left/right counts 1 per press (holding for DAS is still
one press), each rotation counts 1. Pieces placed with a soft drop (tucks, spins)
aren't graded.
*/
var finesse = {key: null, inputs: 0, soft: false, pieces: 0, faults: 0, last: ''}

function finesse_enabled(){
    try{ return localStorage.getItem('finesse') !== 'off' }
    catch(err){ return true }
}

// the current piece: a new piece, a hold, undo or retry starts a new count
function finesse_piece_key(){
    return [game.total_piece, game.tetramino, game.holdmino, game.bag.length].join('|')
}

function finesse_track(){
    attempt_track()
    var key = finesse_piece_key()
    if (finesse.key !== key || finesse.game !== game){
        finesse.key = key
        finesse.game = game
        finesse.inputs = 0
        finesse.soft = false
    }
}

function finesse_input(){ finesse_track(); finesse.inputs += 1 }
function finesse_soft_drop(){ finesse_track(); finesse.soft = true }

// cells the piece covers after a hard drop from (x, y, orientation)
function landing_cells(board_now, piece, x, y, orientation){
    var g = new Game()
    g.board = board_now
    g.tetramino = piece
    g.x = x; g.y = y; g.orientation = orientation
    g.drop()
    return g.to_shape().map(c => c.join()).sort().join('|')
}

// fewest inputs from spawn to a spot that hard drops onto the same cells
function fewest_inputs(board_now, piece, target){
    var g = new Game()
    g.board = board_now
    g.tetramino = piece
    g.x = 4; g.y = 18; g.orientation = 0
    if (g.is_collide()) return null
    var moves = [() => g.move_left(), () => g.move_right(),
                 () => { var x = g.x; g.move_leftmost(); return g.x != x },
                 () => { var x = g.x; g.move_rightmost(); return g.x != x },
                 () => g.rotate_clockwise(), () => g.rotate_anticlockwise(), () => g.rotate_180()]
    var key = () => g.x + ',' + g.y + ',' + g.orientation
    var seen = new Set([key()])
    var layer = [[g.x, g.y, g.orientation]]
    for (var depth=0; depth<8 && layer.length; depth++){
        var next = []
        for (var [x, y, o] of layer){
            if (landing_cells(board_now, piece, x, y, o) == target) return depth
            for (var move of moves){
                g.x = x; g.y = y; g.orientation = o
                if (move() && !seen.has(key())){
                    seen.add(key())
                    next.push([g.x, g.y, g.orientation])
                }
            }
        }
        layer = next
    }
    return null
}

// called just before a hard drop
function finesse_check(){
    finesse_track()
    finesse.last = ''
    if (!finesse_enabled() || finesse.soft || game.tetramino == 'G') return
    var target = landing_cells(game.board, game.tetramino, game.x, game.y, game.orientation)
    var best = fewest_inputs(game.board, game.tetramino, target)
    if (best === null) return
    finesse.pieces += 1
    if (finesse.inputs > best){
        finesse.faults += 1
        var plural = n => n + (n == 1? ' input': ' inputs')
        finesse.last = plural(finesse.inputs) + ', ' + best + ' needed'
    }
}

function draw_finesse(ctx){
    if (!finesse_enabled() || finesse.pieces == 0) return
    ctx.font = "bold 14px Arial ";
    ctx.fillStyle = finesse.faults? 'rgb(235, 79, 101)': 'green'
    ctx.fillText('Finesse ' + (finesse.pieces - finesse.faults) + '/' + finesse.pieces, 10, 420)
    if (finesse.last){
        ctx.fillStyle = 'rgb(235, 79, 101)'
        ctx.fillText(finesse.last, 10, 440)
    }
}

/*
Daily puzzle: page.html#daily plays the same map for everyone on a given (UTC) day.
The page's first map is generated with Math.random seeded from the date and page,
using the page's default options; the real Math.random comes back once the page loads.
*/
var Daily = {
    on: /(^|[#&])daily\b/.test(location.hash.slice(1)),
    date: new Date().toISOString().slice(0, 10),
    page: location.pathname.split('/').pop() || 'index.html',
    map: null,
    ticks: 0,
}

function seeded_random(text){
    // FNV-1a hash of the text, then mulberry32
    var seed = 2166136261
    for (var i=0; i<text.length; i++) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619)
    return function(){
        seed = (seed + 0x6D2B79F5) | 0
        var t = Math.imul(seed ^ seed >>> 15, 1 | seed)
        t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t
        return ((t ^ t >>> 14) >>> 0) / 4294967296
    }
}

// a clock for generators with a time budget: counts calls while the daily map is made,
// so the result doesn't depend on the speed of the device
function budget_clock(){
    if (Daily.seeding) return (Daily.ticks += 1) / 3
    return Date.now()
}

function daily_key(){ return JSON.stringify([Record.finished_map, Record.board[0], Record.shuffled_queue]) }

function is_daily_map(){ return Daily.on && Daily.map !== null && Daily.map === daily_key() }

function load_daily(){
    try{ return JSON.parse(localStorage.getItem('daily')) || {} }
    catch(err){ return {} }
}

// {done: {date: [pages]}, streak, best, last}: a day counts once any daily is solved
function daily_solved(){
    var daily = load_daily()
    daily.done = daily.done || {}
    var today = daily.done[Daily.date] || []
    if (today.includes(Daily.page)) return
    daily.done[Daily.date] = today.concat([Daily.page])
    // keep a month of history
    for (var date of Object.keys(daily.done).sort().slice(0, -31)) delete daily.done[date]
    if (daily.last != Daily.date){
        var yesterday = new Date(Date.parse(Daily.date) - 864e5).toISOString().slice(0, 10)
        daily.streak = daily.last == yesterday? (daily.streak || 0) + 1: 1
        daily.best = Math.max(daily.best || 0, daily.streak)
        daily.last = Daily.date
    }
    try{ localStorage.setItem('daily', JSON.stringify(daily)) } catch(err){}
}

function play_daily(){
    location.hash = 'daily'
    location.reload()
}

function draw_daily(ctx){
    if (!is_daily_map()) return
    var done = (load_daily().done || {})[Daily.date] || []
    ctx.font = "bold 14px Arial ";
    ctx.fillStyle = 'rgb(230, 170, 40)'
    ctx.fillText('Daily ' + Daily.date.slice(5), 420, 575)
    if (done.includes(Daily.page)) ctx.fillText('✓ Solved', 420, 595)
}

if (Daily.on){
    Daily.random = Math.random
    Math.random = seeded_random(Daily.date + '/' + Daily.page)
    Daily.seeding = true
    window.addEventListener('load', () => {
        Math.random = Daily.random
        Daily.seeding = false
        Daily.map = daily_key()
        render()
    })
}

/*
Optional gravity with lock delay. Off by default (pieces float until you drop them);
otherwise the piece falls one row every `gravity_setting()` ms, and once it rests on
something it locks after 500 ms, reset by each move or rotation up to 15 times.
*/
var gravity = {key: null, fall: 0, lock: 0, resets: 0, pos: '', last: 0}
const LOCK_DELAY = 500, LOCK_RESETS = 15

function gravity_setting(){
    try{ return parseInt(localStorage.getItem('gravity')) || 0 }
    catch(err){ return 0 }
}

function gravity_paused(){
    if (typeof game == 'undefined' || !game.tetramino || game.tetramino == 'G') return true
    if (document.hidden || !Controls.can_play() || answer_replay.running) return true
    var setting = document.getElementById('setting')
    if (setting && setting.classList.contains('open')) return true
    // keyboard play needs the board focused ("OUT OF FOCUS"); touch buttons don't
    return !document.body.classList.contains('touch') && document.activeElement !== board
}

function is_grounded(){
    game.y -= 1
    var grounded = game.is_collide()
    game.y += 1
    return grounded
}

function gravity_tick(now){
    requestAnimationFrame(gravity_tick)
    var dt = Math.min(now - (gravity.last || now), 100)
    gravity.last = now
    var speed = gravity_setting()
    if (!speed || gravity_paused()) return
    // a new piece starts fresh
    var key = finesse_piece_key()
    if (gravity.key !== key || gravity.game !== game){
        gravity.key = key; gravity.game = game
        gravity.fall = 0; gravity.lock = 0; gravity.resets = 0
        gravity.pos = ''
    }
    var pos = [game.x, game.y, game.orientation].join()
    if (is_grounded()){
        // moving or rotating on the ground buys more time, a limited number of times
        if (gravity.pos && pos != gravity.pos && gravity.resets < LOCK_RESETS){
            gravity.resets += 1
            gravity.lock = 0
        }
        gravity.pos = pos
        gravity.lock += dt
        if (gravity.lock >= LOCK_DELAY){
            gravity.lock = 0
            harddrop_action()
        }
        return
    }
    gravity.pos = ''
    gravity.lock = 0
    gravity.fall += dt
    var rows = Math.floor(gravity.fall / speed)
    if (rows < 1) return
    gravity.fall -= rows * speed
    game.drop(rows)
    render()
}
requestAnimationFrame(gravity_tick)

/*
Rush: as many puzzles as you can in 3 minutes. Solving one brings the next,
a miss moves on to a new one. The best score per mode is kept ('rush:<page>:<mode>').
*/
const RUSH_TIME = 3 * 60 * 1000
var rush = {on: false}

function rush_key(){
    var page = location.pathname.split('/').pop() || 'index.html'
    return 'rush:' + page + ':' + (Config.mode || '')
}

function rush_best(){
    try{ return parseInt(localStorage.getItem(rush_key())) || 0 }
    catch(err){ return 0 }
}

function rush_button_label(){
    var button = document.getElementById('rush_button')
    if (button) button.textContent = rush.on? 'Stop rush': 'Rush (3 min)'
    if (button) set_short_label(button)
}

function start_rush(){
    if (rush.on) return finish_rush(true)
    rush = {on: true, end: Date.now() + RUSH_TIME, solved: 0, missed: 0, skip_retry: false, auto: Config.auto_next_ind}
    Config.auto_next_ind = true
    play_a_map()
    rush.timer = setInterval(() => Date.now() >= rush.end? finish_rush(false): render(), 250)
    rush_button_label()
    flash_result(true, 'Rush: go!')
    render()
    if (typeof board != 'undefined') board.focus()
}

function finish_rush(stopped){
    clearInterval(rush.timer)
    rush.on = false
    Config.auto_next_ind = rush.auto
    rush_button_label()
    if (stopped){
        flash_result(false, 'Rush stopped')
        render()
        return
    }
    var best = rush_best()
    if (rush.solved > best){
        try{ localStorage.setItem(rush_key(), rush.solved) } catch(err){}
    }
    var text = 'Rush over: ' + rush.solved + ' solved' + (rush.solved > best? (best? ' · new best!': ''): ' · best ' + best)
    flash_result(rush.solved > 0, text)
    render()
}

function draw_rush(ctx){
    if (!rush.on) return
    var left = Math.max(0, rush.end - Date.now())
    var minutes = Math.floor(left / 60000), seconds = Math.floor(left / 1000) % 60
    ctx.font = "bold 20px Arial ";
    ctx.fillStyle = left < 20000? 'rgb(235, 79, 101)': 'rgb(246, 208, 60)'
    ctx.fillText('Rush ' + minutes + ':' + String(seconds).padStart(2, '0'), 10, 480)
    ctx.font = "bold 14px Arial ";
    ctx.fillText(rush.solved + ' solved', 10, 500)
    ctx.fillText('best ' + rush_best(), 10, 518)
}
