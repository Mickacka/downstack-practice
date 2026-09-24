// Code shared by every game page (loaded after header.js, before the page script).
// Page scripts define the globals used here: game, Config, play(), detect_win(), show_ans().

const Keybind = {'keydown':{}, 'keyup':{}}
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

function play_sound(){
    if (game.combo >= 0){
        sound[Math.min(6,game.combo)].cloneNode().play()
    }
}

function render(){
    var ctx = document.getElementById("board").getContext('2d');
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

    ctx.fillText('Trial:',420,450)
    ctx.fillText(Config.no_of_success+'/'+Config.no_of_trial,420,470)

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
    for (var i=0; i<10; i++){
        document.getElementById('input'+(i+1)).value = Customized_key[i]
    }
    document.getElementById('input11').value = Config.das
    document.getElementById('input12').value = Config.arr
    var auto_next = document.getElementById('input12.1')
    if (auto_next) auto_next.checked = Config.auto_next_ind
}

function save_setting(){
    for (var i=0; i<10; i++){
        Customized_key[i] = document.getElementById('input'+(i+1)).value
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

    add_generic_keybind(Customized_key[3], ()=> Controls.harddrop())
    add_generic_keybind(Customized_key[4], ()=> (game.rotate_anticlockwise(), Controls.after_rotate()))
    add_generic_keybind(Customized_key[5], ()=> (game.rotate_clockwise(), Controls.after_rotate()))
    add_generic_keybind(Customized_key[6], ()=> (game.rotate_180(), Controls.after_rotate()))
    add_generic_keybind(Customized_key[7], ()=> game.hold())
    add_generic_keybind(Customized_key[8], ()=> retry())
    if (Controls.show_answer) add_generic_keybind(Customized_key[9], ()=> Controls.show_answer())
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
        if (!is_typing() && func != undefined && Controls.can_play()){
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
        var ctx = board.getContext('2d');
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
        if (!Controls.can_play()) return
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
    press('tc-hd', () => Controls.harddrop())
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
