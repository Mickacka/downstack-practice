
var game = new Game();
var Config = {'das':100, 'arr':0, 'delay':0, 'pressing_left':false, 'pressing_right': false, 'pressing_down': false, 'pressing':{},
'skim_ind':false, 'mdhole_ind':false, 'unqiue_ind':true, 'smooth_ind':true, 'auto_next_ind':true,
'mode':'prepare', 'no_of_unreserved_piece':7, 'no_of_piece':7,
'no_of_trial':0, 'no_of_success':0}

/*
0. sound effect
*/


/*
1. html related
*/


function load_gamemode(){
    document.getElementById('input13').value = Config.no_of_piece
    document.getElementById('input14').checked = Config.skim_ind
    document.getElementById('input15').checked = Config.mdhole_ind
    document.getElementById('input16').checked = Config.unqiue_ind
    document.getElementById('input17').checked = Config.smooth_ind
}



function save_gamemode(){
    Config.no_of_piece = parseInt(document.getElementById('input13').value)
    if (! (Config.no_of_piece>=2 && Config.no_of_piece<=7)){
        alert('no of piece should be between 2 to 7')
        Config.no_of_piece = 7
    }
    Config.skim_ind = document.getElementById('input14').checked
    Config.mdhole_ind = document.getElementById('input15').checked 
    Config.unqiue_ind = document.getElementById('input16').checked
    Config.smooth_ind = document.getElementById('input17').checked
}

/*
2. render
*/
/*
3. keybind
*/







// bind('keydown ArrowRight>', lambda event: (release_right()))




Controls.bind_options = () => {
    document.getElementById('input13').oninput = e=>{save_gamemode()}
    document.getElementById('input14').onchange = e=>{save_gamemode()}
    document.getElementById('input15').onchange = e=>{save_gamemode()}
    document.getElementById('input16').onchange = e=>{save_gamemode()}
    document.getElementById('input17').onchange = e=>{save_gamemode()}
}

/*
4. map generation
*/
Record={
    added_line:[],
    board:[],
    piece_added:[],
    shuffled_queue:['I','O','J','L','S','Z','T'],
    finished_map:[
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'],
    ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N']],
    
}

// 4.1 add line
function add_line(row_idx){
    for (var i=0; i<10; i++){
        for (var j=19; j>row_idx; j--){
            game.board[j][i] = game.board[j-1][i]
        }
        game.board[row_idx][i] = 'G'
    }
    Record.added_line.push(row_idx)
}

function add_random_line(){
    var max_height = game.get_max_height()
    
    var row_index = Math.floor(Math.random()*(max_height+2))
    Record.added_line = []

    probability = (Config.mode == "downstack")? [0.1,0.15,0.3,0.7] :[0.1,0.15,0.3,1]
    var rng = Math.random()
    if (rng<probability[0]){
        add_line(row_index)
        add_line(row_index+1)
        add_line(row_index+2)
    }
    else if (rng<probability[1]&& row_index < max_height+1){
        add_line(row_index)
        add_line(row_index+2)
    }
    else if (rng<probability[2]){
        add_line(row_index)
        add_line(row_index+1)
    }
    else if (rng<probability[3]){
        add_line(row_index)
    }
}

function add_random_line_less_skim(){
    var non_garbages = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    for (var row_idx=0; row_idx<20; row_idx++)
        for (var col_idx=0; col_idx<10; col_idx++)
            if (game.board[row_idx][col_idx] != 'G')
                non_garbages[row_idx] += 1
    
    var garbage_height = 0
    for (var num of non_garbages){
        if (num == 1)
            garbage_height+=1
        else
            break}
    var row_index = garbage_height
    Record.added_line = []

    probability = (Config.mode == "downstack")? [0.1,0.3,0.7]  :[0.1,0.3,1]
    var rng = Math.random()
    if (rng<probability[0]){
        add_line(row_index)
        add_line(row_index+1)
        add_line(row_index+2)
    }
    else if (rng<probability[1]){
        add_line(row_index)
        add_line(row_index+1)
    }
    else if (rng<probability[2]){
        add_line(row_index)
    }
}
// 4.2 validation test



    


function is_smooth(arr){
    var uped = false
    var downed = false
    var last = null
    for (var ele of arr){
        if (last == null){
            last = ele
        }
        else{
            
            if (ele - last >1){
                uped = true
            }
            else if (last - ele >1){
                if (uped) return false
                downed = true
            }
            last = ele
        }
    }
    return true
}

function is_few_non_cheese_hole(){
    var height = []
    for (var col_idx=0; col_idx<10; col_idx++) {
        var h=0
        for (var row_idx=0; row_idx<20; row_idx++){ 
            if (game.board[row_idx][col_idx] == 'G'){
                h=row_idx}}
        height.push(h)
    }
    if (! is_smooth(height))
    return false
    if (Config.smooth_ind){
        var height_copy = [...height].sort(function(a, b){return a - b})
        if (height_copy[8] - height_copy[1] > 5)
            return false
    }
    if (Config.mode == 'downstack'){
        lowest_gap_col = 0
        for (var col_idx=0; col_idx<10; col_idx++){
            if (game.board[0][col_idx] != 'G')
                lowest_gap_col = col_idx
        }
        lowest_gap_height = 0
        for (var row_idx=0; row_idx<20; row_idx++){
            if (game.board[row_idx][lowest_gap_col] != 'G')
                lowest_gap_height = row_idx
            else
                break
        }  
        console.log(height[lowest_gap_col] - lowest_gap_height)
        if (height[lowest_gap_col] - lowest_gap_height < 2) return false
    }



    var holes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    var non_garbages = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    for (var row_idx=0; row_idx<20; row_idx++) 
        for (var col_idx=0; col_idx<10; col_idx++){
            if (game.board[row_idx][col_idx] != 'G')
                non_garbages[row_idx] += 1
            if (game.board[row_idx][col_idx] != 'G' && row_idx < height[col_idx])
                holes[row_idx] += 1}

    
    var no_of_non_cheese_holes = 0
    var is_cheese_level = true
    for (var i=0; i<20; i++){
        var non_garbage = non_garbages[i]
        var hole = holes[i]
        if (non_garbage != 1){
            is_cheese_level = false}
        if (! is_cheese_level){
            no_of_non_cheese_holes += hole
        }
    }
    return no_of_non_cheese_holes <= Config.mdhole_ind
}

// 4.3 try to add pieces
function try_a_piece(){
    // find position piece that include (x,y)
    // find neighbour piece
    if (try_drop()){
        
        //pass test if the piece is reachable , the added line is clearable , the piece is not floatable , unstability == 0 and there are few holes
        var test = ! is_floatable()
        var shape = game.to_shape()
        test = test && Record.added_line.every(val => shape.some(pos => val==pos[1]))
        test = test && is_few_non_cheese_hole()
        test = test && (get_unstability() == 0)
        test = test && (is_exposed() || is_spinable())
        for (var [col, row] of shape){
            game.board[row][col] = "G"
        }
        return test

    }

    return false
}

function is_unique(bag){
    counter = {I:0, O:0, T:0, J:0, L:0, Z:0, S:0}
    for (var piece of bag){
        counter[piece] += 1
        if (counter[piece] > 1)
            return false
        if (piece == last_piece)
            return false
        last_piece = piece
    }
    return true
}

function is_even_distributed(bag){
    var last_piece = null
    var counter = {I:0, O:0, T:0, J:0, L:0, Z:0, S:0}
    var limit = {I:2, O:2, T:2, J:2, L:2, Z:2, S:2}
    if (Config.unqiue_ind){
        limit = {I:1, O:1, T:1, J:1, L:1, Z:1, S:1}
    }
    if (Config.mode == 'comboquad'){
        limit.I -= 1}
    else if (Config.mode == 'combotsd'){
        limit.T -= 1}
    for (var piece of bag){
        
        counter[piece] += 1
        if (counter[piece] > limit[piece])
            return false
        if (piece == last_piece)
            return false
        last_piece = piece
    }
    if (counter.I + counter.J + counter.L >4){
        return false
    }
    return true
}

function try_all_pieces(){
    var seenbag = []
    var unseenbag = []
    for (var piece of 'IOTJLZS'){
        if (Record.piece_added.includes(piece)){
            seenbag.push(piece)
        }
        else{
            unseenbag.push(piece)
        }
    }
    shuffle(seenbag)
    shuffle(unseenbag)
    
    var bag = unseenbag.concat(seenbag)
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
    //step 1 add line
    if (Config.skim_ind){
        add_random_line()}
    else{
        add_random_line_less_skim()}
    //step 2 try to add piece
    if (try_all_pieces()){
        game.lock()
        Record.board.push(clone(game.board))
        return true
    }
    else{
        return false}
}




// 4.4 shuffle queue and play / restart
function play(){
    game = new Game()

    
    game.bag = Record.shuffled_queue.concat(['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G'])
    game.update()
    game.holdmino = ''
    game.hold()
    if ((Record.board.length)>0){
        game.board = clone(Record.board[Record.board.length-1])
        for (var row_idx=0; row_idx<20; row_idx++){
            for (var col_idx=0; col_idx<10; col_idx++){
                if (game.board[row_idx][col_idx] != 'G'){
                game.board[row_idx][col_idx] = 'N'}}}
    }
}
// 4.5 generate the final map and develop the progression
function generate_final_map(){
    
    game = new Game()

    if (Config.mode == 'combopc'){
        return true}
    else if (Config.mode == 'combo' || Config.mode == 'downstack'){
        var height = []
        for (var i=0; i<10; i++){
            height.push(Math.floor(Math.random()*3))}
        var gap_col = Math.floor(Math.random()*10)
        height[gap_col] = 0
        for (var j=0; j<20; j++){
            for (var i=0; i<10; i++){
                if (j < height[i]){
                    game.board[j][i] = 'G'}}}
    }

    else if (Config.mode == 'comboquad'){
        var height = []
        for (var i=0; i<10; i++)
            height.push(Math.floor(Math.random()*3)+4)
        var gap_col = Math.floor(Math.random()*10)
        height[gap_col] = 0
        for (var j=0; j<20; j++){
            for (var i=0; i<10; i++){
                if (j < height[i]){
                    game.board[j][i] = 'G'}}}
    }
    else if (Config.mode == 'combotsd'){
        var height = []
        for (var i=0; i<10; i++)
            height.push(Math.floor(Math.random()*3)+2)
        var tsd_col = Math.floor(Math.random()*8)+1
        height[tsd_col] = 0
        if (tsd_col == 1){
            is_left = false}
        else if (tsd_col == 8){
            is_left = true}
        else{
            is_left = Math.floor(Math.random()*2)}
        var sign_left = is_left==1? 1:-1
        height[tsd_col + (sign_left)] = 1
        for (var j=0; j<20; j++){
            for (var i=0; i<10; i++){
                if (j < height[i]){
                    game.board[j][i] = 'G'}}}
        game.board[1][tsd_col - (sign_left)] = 'N'
        
        if (is_left){
            game.board[2][tsd_col-1] = 'G'
            game.board[0][tsd_col-2] = 'G'
            game.board[1][tsd_col-2] = 'G'
            game.board[2][tsd_col-2] = 'G'
        }
        else{
            game.board[2][tsd_col+1] = 'G'
            game.board[0][tsd_col+2] = 'G'
            game.board[1][tsd_col+2] = 'G'
            game.board[2][tsd_col+2] = 'G'
        }

        var lines_add = Math.floor(Math.random()*3)
        var is_tsd_col = Math.floor(Math.random()*2)
        var col_add = (is_tsd_col == 1)? tsd_col: Math.floor(Math.random()*10)
        //col_add cannot be the same as overhang
        if (col_add == tsd_col-1*sign_left || col_add == tsd_col-2*sign_left){
            col_add = tsd_col
        }
        game.board[2][col_add]='N'
        for (var row_idx=0; row_idx<lines_add; row_idx++){
            add_line(row_idx)
            game.board[row_idx][col_add]='N'
        }
        
        Record.added_line=[]
    }
}
last_info = 'null'

function generate_a_ds_map(move){
    

    for (var trial=0; trial<5; trial++){
        if (move == 1){
            success_generate = try_a_move()}
        else{
            success_generate = try_a_move() && generate_a_ds_map(move - 1)}
        if (success_generate){
            return true}
        else{
            if (Config.skim_ind || Config.mode == 'combotsd'){
            var info = `${game.tetramino} ${game.x} ${game.y} ${game.orientation}`
            if (info == last_info ) 
                {trial += 2}
            last_info = info
            }
            Record.board.length = Config.no_of_unreserved_piece-move
            Record.piece_added.length = Config.no_of_unreserved_piece-move
            if (Record.board.length > 0){
                game.board = clone(Record.board[Record.board.length-1])}
            else{
                game.board = clone(Record.finished_map)}
        }
    }
    return false
}

function play_a_map(mode = null){
    if (mode == null){
        mode = Config.mode}
    
    game = new Game()

    Config.no_of_unreserved_piece = Config.no_of_piece - ['comboquad','combotsd'].includes(mode)
    Config.mode = mode
    
    generate_final_map()
    Record.finished_map = clone(game.board)
    game.drawmode = true
    Record.piece_added = []
    Record.board = []
    
    for (var i=0; i<999; i++) {
        if (i==50){
            Config.skim_ind = false
        }
        if (generate_a_ds_map(Config.no_of_unreserved_piece) && game.get_max_height() < 17 ){
            var queue = [...Record.piece_added].reverse()
            if (Config.mode == 'comboquad'){
                queue.push('I')}
            else if (Config.mode == 'combotsd'){
                queue.push('T')}
            Record.shuffled_queue = get_shuffled_holdable_queue(queue)
            if (Record.shuffled_queue.length >0){
                break}
        }
        else if (i%2 == 1){
            generate_final_map()
            Record.finished_map = clone(game.board)
            game.drawmode = true
            Record.piece_added = []
            Record.board = []
        }
        
    }
      
    Config.skim_ind = document.getElementById('input14').checked
    
    play()
    
    game.drawmode = false
    render()
    // update_stat()
    // update_win_text()
}

function play_a_combo_map(){
    play_a_map('combo')
    document.getElementById('winning_requirement1').innerHTML = Config.no_of_piece-1+' Combo'
    document.getElementById('winning_requirement2').innerHTML = '<br>'
}

function play_a_combopc_map(){
    play_a_map('combopc')
    document.getElementById('winning_requirement1').innerHTML = Config.no_of_piece-1+' Combo'
    document.getElementById('winning_requirement2').innerHTML = 'All Clear at the end'
}

function play_a_comboquad_map(){
    play_a_map('comboquad')
    document.getElementById('winning_requirement1').innerHTML = Config.no_of_piece-1+' Combo'
    document.getElementById('winning_requirement2').innerHTML = 'Quad at the end'
}

function play_a_combotsd_map(){
    play_a_map('combotsd')
    document.getElementById('winning_requirement1').innerHTML = Config.no_of_piece-1+' Combo'
    document.getElementById('winning_requirement2').innerHTML = 'Tspin Double at the end'
}

function play_a_downstack_map(){
    play_a_map('downstack')
    document.getElementById('winning_requirement1').innerHTML = 'No Empty Space below Blocks at the end'
    document.getElementById('winning_requirement2').innerHTML = 'It means open all garbage holes'
}

function all_grounded(){
    for (var col_idx=0; col_idx<10; col_idx++) {
        var is_grounded = true
        for (var row_idx=0; row_idx<20; row_idx++){
            if (game.board[row_idx][col_idx] != 'N'){
                if (!is_grounded){
                return false}

            }
            else{
                is_grounded = false}
        }
    }
    return true
}

function detect_win(){
    if (game.total_piece == 1){
        Config.no_of_trial += 1
    }
    if (game.total_piece == Config.no_of_piece){
        
        if ((Config.mode == 'downstack' && all_grounded())||
        ((game.combo == Config.no_of_piece-1) &&
        ((Config.mode == 'combo')||
        (Config.mode == 'combopc' && game.pc)||
        (Config.mode == 'comboquad' && game.line_clear == 4)||
        (Config.mode == 'combotsd' && game.line_clear == 2 && game.b2b >= 0)))){
            report_result(true)
            if (Config.auto_next_ind){
                play_a_map()}
            Config.no_of_success += 1
        }
        else{
            report_result(false)
            retry()
        }
            
    }
}


function show_ans(){
    if (Record.board.length>0){
        game.board = clone(Record.board[Record.board.length-1])
        render()
        setTimeout(retry, 3000)
    }
}

function show_hint(){
    
    document.getElementById('hint_button').textContent = Record.piece_added[Record.piece_added.length-1] + " piece , then " + Record.piece_added[Record.piece_added.length-2] + " piece"
    setTimeout(()=>{document.getElementById('hint_button').textContent = "Show Hint"}, 3000)
    
}

/*
5. start
*/
set_event_listener()
load_setting()
load_gamemode()
update_keybind()
board.focus()
play_a_combo_map()
render()

