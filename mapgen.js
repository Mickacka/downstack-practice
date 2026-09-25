// Map-generation helpers shared by the generated-map pages (loaded after common.js).
// Page scripts define the globals used here: game, Config, Record.

function try_drop(){//return whether garbage below current piece can be converted to current piece in current column
    var shape = game.to_shape()
    var heights = []
    for (var[c,r] of shape) heights.push(r)
    var lowest_height = Math.min(...heights)

    var min_relative_height = 20
    for (var [col, row] of shape){
        var ground_height = 0
        for (var i=0; i<row; i++)
            if (game.board[i][col] == 'G')
                ground_height = i+1
        min_relative_height = Math.min(min_relative_height, row - ground_height)
    }


    for (var fall=min_relative_height+1; fall<=lowest_height; fall++){

        var all_g = true

        for (var [col, row] of shape){
            if (game.board[row-fall][col] != 'G'){
                all_g = false
                break
            }
        }
        if (all_g){
            for (var [col, row] of shape){
                game.board[row-fall][col] = 'N'}
            game.y -= fall
            return true
        }
    }
    return false

}

function is_exposed(){//return whether exist garbage above current piece
    for (var [col, row] of game.to_shape()){
        for (var j=row+1; j<20; j++){
            if (game.board[j][col] == 'G'){
                return false}}}
    return true}

function is_floatable(){//return whether exist garbage 1 block below current piece
    for (var [col, row] of game.to_shape()){
        if (row == 0 || game.board[row-1][col] == 'G'){
            return false}}
    return true}

function is_spinable(depth = 1){
    if (depth > 2){
        return false}
    var piece_info = [game.x, game.y, game.orientation]

    if (depth == 2){
        if (game.move_left()){
            if (is_exposed() && ! is_floatable()){
                game.x += 1
                return true
            }
        }
        if (game.move_right()){
            if (is_exposed() && ! is_floatable()){
                game.x -= 1
                return true
            }
        }
    }
    if (game.rotate_clockwise()){
        if ((is_exposed() && ! is_floatable()) || is_spinable(depth+1)){
            game.rotate_anticlockwise()
            if (piece_info[0]==game.x && piece_info[1]==game.y && piece_info[2]==game.orientation){
                return true}
        }
    }

    [game.x, game.y, game.orientation] = piece_info
    if (game.rotate_anticlockwise()){
        if ((is_exposed() && ! is_floatable()) || is_spinable(depth+1)){
            game.rotate_clockwise()
            if (piece_info[0]==game.x && piece_info[1]==game.y && piece_info[2]==game.orientation){
                return true}
        }
    }


    [game.x, game.y, game.orientation] = piece_info
    if (game.rotate_180('simple')){
        if ((is_exposed() && ! is_floatable())){

            game.rotate_180('simple')
            return true
        }
    }

    return false
}

function get_unstability(){
    var grounded_position = new Set()
    var ungrounded_position = new Set()
    for (var col_idx=0; col_idx<10; col_idx++) {
        var is_grounded = true
        for (var row_idx=0; row_idx<20; row_idx++){
            if (game.board[row_idx][col_idx] == 'G'){
                if (is_grounded){
                    grounded_position.add(JSON.stringify([row_idx,col_idx]))}
                else{
                    ungrounded_position.add([row_idx,col_idx])}
            }
            else{
                is_grounded = false}
        }
    }

    //test if ungrounded are next to grounded
    var unstability = 0
    for (var [row_idx, col_idx] of ungrounded_position){

        var right_grounded = (col_idx < 9) &&  grounded_position.has(JSON.stringify([row_idx, col_idx+1]))
        var left_grounded = (col_idx > 0) && grounded_position.has(JSON.stringify([row_idx, col_idx-1]))
        if (! (right_grounded || left_grounded)){
            unstability += 1}
    }
    return unstability}

function is_good_queue(queue){
    var accum = []
    var count = 1
    for (var ele of queue){
        if (accum.includes(ele)){
            accum = []
            count ++
        }
        accum.push(ele)
    }
    return count <= 2
}

function get_shuffled_holdable_queue(queue){

    var size = queue.length
    if (2<= size && size<=7){
        var selected_table = reverse_hold_table[size]
        shuffle(selected_table)
        for (var selected_row of selected_table){
            var result = []
            for (var pointer of selected_row){
                result.push(queue[pointer])
            }
            if (is_good_queue(result)){

                return result
            }
        }

    }
    return []
}
