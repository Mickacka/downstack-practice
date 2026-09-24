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
}

function update_keybind(){
    Keybind.keydown = {}
    Keybind.keyup = {}

    Keybind.keydown[Customized_key[0]] = e=>{press_left(true)}
    Keybind.keyup[Customized_key[0]] = e=>{release_left(true)}

    Keybind.keydown[Customized_key[1]] = e=>{press_right(true)}
    Keybind.keyup[Customized_key[1]] = e=>{release_right(true)}

    Keybind.keydown[Customized_key[2]] = e=>{press_down(true)}
    Keybind.keyup[Customized_key[2]] = e=>{release_down(true)}

    add_generic_keybind(Customized_key[3], ()=> harddrop_action())
    add_generic_keybind(Customized_key[4], ()=> (game.rotate_anticlockwise(), Controls.after_rotate()))
    add_generic_keybind(Customized_key[5], ()=> (game.rotate_clockwise(), Controls.after_rotate()))
    add_generic_keybind(Customized_key[6], ()=> (game.rotate_180(), Controls.after_rotate()))
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
    Controls.bind_options()
    setup_touch_controls();

    // preventDefault stops Android's long-press menu / text selection and the
    // emulated mouse click; that needs a non-passive listener
    const press = (id, func) => document.getElementById(id).addEventListener('touchstart', e => {
        e.preventDefault()
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
    press('tc-dr', () => (game.rotate_180(), Controls.after_rotate()))
    press('tc-h', () => game.hold())
    press('tc-hd', () => harddrop_action())
    press('tc-l', () => press_left(true))
    release('tc-l', () => release_left(true))
    press('tc-r', () => press_right(true))
    release('tc-r', () => release_right(true))
    press('tc-d', () => press_down(true))
    release('tc-d', () => release_down(true))
    press('tc-cc', () => (game.rotate_anticlockwise(), Controls.after_rotate()))
    press('tc-c', () => (game.rotate_clockwise(), Controls.after_rotate()))
    document.getElementById('tcc').addEventListener('contextmenu', e => e.preventDefault())
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

// Every mode reports the end of an attempt here: plays the sound, flashes the
// result over the board and records it. `reason` explains a miss when known.
function report_result(won, reason){
    sound[won? 'win': 'lose'].play()
    var stats = load_stats()
    stats.tries += 1
    if (won){
        stats.solved += 1
        stats.streak += 1
        stats.best = Math.max(stats.best, stats.streak)
    }
    else stats.streak = 0
    save_stats(stats)
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
    for (var k=boards.length-1; k>=0; k--){
        var before = k > 0? boards[k-1]: Record.finished_map
        var frame = strip_pieces(boards[k])
        for (var [col, row] of carved_cells(before, boards[k])) frame[row][col] = boards[k][row][col]
        frames.push(frame)
    }
    frames.push(strip_pieces(Record.finished_map))
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
