
var game = new Game();
var Config = {'das':100, 'arr':0, 'delay':0, 'pressing_left':false, 'pressing_right': false, 'pressing_down': false, 'pressing':{},
'skim_ind':true, 'mdhole_ind':false, 'unqiue_ind':true, 'auto_next_ind':true,
'mode':'4x4 box', 'no_of_unreserved_piece':7, 'no_of_piece':7,
'no_of_trial':0, 'no_of_success':0}


function clone2d(arr){
    var newarr = []
    for (var sub_arr of arr){
        newarr.push([...sub_arr])
    }
    return newarr
}

fetch('./usermode.json')
.then(results=>results.json())
.then(d=>{jsondata = d})

/*
0. sound effect
*/
    

/*
1. html related
*/



function load_gamemode(){
    var text = ''
    for (var modname in jsondata){
        text += `<option value="${modname}">${modname}</option>`
    }
    text += '<option value="customized">customized</option>'
    document.getElementById('input13').innerHTML = text;
}



function save_gamemode(){
    var selection = document.getElementById('input13')
    Config.mode = selection.options[selection.selectedIndex].value
}

/*
2. render
*/
/*
3. keybind
*/







// bind('keydown ArrowRight>', lambda event: (release_right()))




Controls.after_rotate = () => { if (game.tetramino == 'O') game.drop(1) }
Controls.show_answer = () => pcfinder()
Controls.bind_options = () => {
    document.getElementById('input13').onchange = e=>{
        save_gamemode()
        var is_hidden = !(Config.mode == 'customized')
        document.getElementById('customized').hidden = is_hidden
    }
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
    last_paint: -1
}

function random_choose(arr){
    var idx = Math.floor(Math.random() * arr.length)
    return arr[idx]
}

function get_shuffled_holdable_queue(queue){
    var result = []
    var size = queue.length
    if (2<= size && size<=7){
        var rng = Math.floor(Math.random()*reverse_hold_table[size].length)
        var selected_table = reverse_hold_table[size][rng]
        for (var pointer of selected_table){
            result.push(queue[pointer])}
    }
    return result
}
// 4.4 shuffle queue and play / restart
function play(){
    game = new Game()
    game.board = clone(Record.finished_map)

    game.bag = Record.piece_added.concat(['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G'])
    game.update()
    game.holdmino = ''
    game.hold()
    
}



function play_a_map(mode = null){
    if (mode == null){
        mode = Config.mode}
    Config.mode = mode

    if (mode == 'customized'){
        play_a_customized_map()
        return
    }
    game = new Game()
    Config.no_of_piece = jsondata[mode]["no_of_piece"]
    game.board = clone2d(jsondata[mode]['board']).reverse()
    Record.finished_map = clone(game.board)
    Record.piece_added = [...random_choose(jsondata[mode]['queue'])]


    play()
    render()

}





function detect_win(){
    if (game.total_piece == 1){
        Config.no_of_trial += 1
    }
    if (game.pc){
        sound['win'].play()
        if (Config.auto_next_ind){
            play_a_map()}
        Config.no_of_success += 1
    }
    else if (game.total_piece == Config.no_of_piece){

        sound['lose'].play()
        retry()

    }
}

// 4.5 customized_map
function load_map(){
    document.getElementById('field_error').innerHTML = ''
    var partial_map = document.getElementById('field').value.trim().split('\n').reverse()
    if (partial_map.length == 1 && partial_map[0] == ''){
        return true
    }
    
    if (partial_map.length >20){
        document.getElementById('field_error').innerHTML = 'too many lines in field'
        return false}
    for (var line of partial_map){
        if (line.length != 10 ){
            document.getElementById('field_error').innerHTML = 'there must be 10 characters in each line'
            return false}}
    for (var j=0; j<partial_map.length; j++){
        for (var i=0; i<10; i++){
            if (partial_map[j][i] == 'X'){
                game.board[j][i] = 'G'
            }
            else if (partial_map[j][i] == '_'){
                game.board[j][i] = 'N'
            }
            else if ('IOTSZJL'.includes(partial_map[j][i])){
                game.board[j][i] = partial_map[j][i]
            }
            else{
                document.getElementById('field_error').innerHTML = 'only characters of "_XIOTSZJL" allowed'
                return false
            }
        }
    }
    return true
}
function play_a_customized_map(){
    game = new Game()
    var is_loaded = load_map()
    var queue = queue_generator(document.getElementById('input_queue').value)
    if (!queue || !is_loaded){
        console.log('invalid format')
        return false
    }
    Record.finished_map = clone(game.board)
    Record.piece_added = queue
    Config.no_of_piece = Record.piece_added.length
    play(false)
    render()
}

function queue_generator(expr){
    //example of queue I,[IJLOSTZ]p3; I,*p3
    document.getElementById('queue_error').innerHTML = ''
    var tokens = expr.split(',')
    var queue = []
    
    for (var token of tokens){
        var is_hat = false
        var is_factorial = false
        var repeat = 1
        var subqueue = ''
        var splitted_token = token.split('p')

        if (splitted_token.length == 2){
            if (splitted_token[1] != ''){
                if (isNaN(splitted_token[1])){
                    document.getElementById('queue_error').innerHTML = 'invalid format, cannot read ' + splitted_token[1]
                    return false
                }
                repeat = parseInt(splitted_token[1])
            }
        }
        else if (splitted_token.length == 1){
            if (splitted_token[0].endsWith('!')){
                splitted_token[0] = splitted_token[0].slice(0, splitted_token[0].length-1)
                is_factorial = true
            }
        }
        else{
            document.getElementById('queue_error').innerHTML = 'invalid format, cannot read ' + token
            return false
        }

        if (splitted_token[0].startsWith('[')  && splitted_token[0].endsWith(']')){
            var queue_token = splitted_token[0].slice(1,splitted_token[0].length-1)
        }
        else{
            var queue_token = splitted_token[0]
        }

        if (queue_token.startsWith('^')){
            queue_token = queue_token.slice(1)
            is_hat = true
        }
        
        
        for (var letter of queue_token){

            if (letter == '*'){
                if (queue_token.length != 1){
                    document.getElementById('queue_error').innerHTML = 'invalid format, cannot read ' + queue_token
                    return false
                }
                subqueue = 'IJLOSTZ'
            }

            else if ('IJLOSTZ'.includes(letter)){
                subqueue += letter
            }
            else{
                document.getElementById('queue_error').innerHTML = 'invalid format, cannot read ' + queue_token
                return false
            }
        }

        if (is_hat){
            subqueue = [...'IJLOSTZ'].filter(x=>!subqueue.includes(x)).join('')
        }
        if (is_factorial){
            repeat = subqueue.length
        }
        console.log(subqueue, repeat)
        if (subqueue.length >0){
            if (repeat > subqueue.length){
                document.getElementById('queue_error').innerHTML = `bag ${subqueue} has only ${subqueue.length} shapes`
                return false
            }
            var added = [...subqueue]
            shuffle(added)
            queue = queue.concat(added.slice(0,repeat))
        }

    }
    return queue
}

function gen_url(){
    //window.location.pathname
    var first = 'https://himitsuconfidential.github.io/downstack-practice/usermode.html/'
    var second = document.getElementById('field').value
    var third = document.getElementById('input_queue').value
    var output = document.getElementById('output_url')
    output.value = first + second + '=' +third
    output.focus()
    output.select()
    
}
function pcfinder(){
    var url = 'https://wirelyre.github.io/tetra-tools/pc-solver.html'
    var field = []
    for (var i=0; i<190; i++) field.push(0)
    console.log(field.length, JSON.stringify(field))
    for (var row=3; row>=0; row--){
        for (var col=0; col<10; col++){
            console.log(game.board[row][col])
            if (game.board[row][col] == 'N')
                field.push(0)
            else
                field.push(8)
        }
    }
    console.log(field.length, JSON.stringify(field))
    for (var i=0; i<10; i++) field.push(0)
    console.log(field.length, JSON.stringify(field))
    var queue = [...game.holdmino].filter(x=>x!='G').join('') + game.bag.filter(x=>x!='G').join('')
    
    var fumen= encode_simple(field,queue)

    console.log(fumen)
    window.open(url+'?fumen='+ encodeURIComponent(fumen))
}

function sfinder(){
    var url = 'https://sfinder.sixwi.de'
    var field = []
    for (var i=0; i<230-80; i++) field.push(0)
    console.log(field.length, JSON.stringify(field))
    var clearLines = 0
    var countOccupied = 0
    for (var row=7; row>=0; row--){
        for (var col=0; col<10; col++){
            console.log(game.board[row][col])
            if (game.board[row][col] == 'N')
                field.push(0)
            else
                field.push(8)
                
        }
    }

    for (var row=0; row<=7; row++){
        for (var col=0; col<10; col++){
            if (game.board[row][col] != 'N'){
                countOccupied ++
                clearLines = row+1
            }
                
        }
    }
    if ((clearLines*10 - countOccupied) % 4 ==2) clearLines ++
    console.log(field.length, JSON.stringify(field))
    for (var i=0; i<10; i++) field.push(0)
    console.log(field.length, JSON.stringify(field))
    var queue = [...game.holdmino].filter(x=>x!='G').join('') + game.bag.filter(x=>x!='G').join('')
    
    var fumen= encode_simple(field,queue)

    console.log(fumen, clearLines,queue)
    window.open(url+'?fumen='+ encodeURIComponent(fumen) + '&command=path&game=jstris&clearLines='+clearLines+'&queue=' + queue)
}
/*
4.6 pcwizard
*/
function toggle_pcwizard() {
    const dropdown = document.querySelector('.nav .dropdown');
    const pcwizard = document.getElementById('pcwizard');
    dropdown.classList.remove('open');
    pcwizard.classList.toggle('open');
    
    
}
document.getElementById('pcwizard_option').onchange = (e=>{
    var instrution =
    ['Enter 0 pieces',
    'Enter 4 pieces e.g. IOTS',
    'Enter 1 pieces e.g. I',
    'Enter 5 pieces e.g. IOTSZ',
    'Enter 2 pieces e.g. IO',
    'Enter 6 pieces e.g. IOTSZJ',
    'Enter 3 pieces e.g. IOT',
    ]
    document.getElementById('pcwizard_instruction').textContent = instrution[document.getElementById('pcwizard_option').selectedIndex]
})
function close_pcwizard() {
    const pcwizard = document.getElementById('pcwizard');
    pcwizard.classList.remove('open');
    

}

function save_wizard(){
    var input_queue = document.getElementById('input_queue')
    var pcwizard_queue = document.getElementById('pcwizard_queue')
    var pcwizard_option = document.getElementById('pcwizard_option')
    var pcwizard_error = document.getElementById('pcwizard_error')
    input_queue.value = pcwizard_queue.value + pcwizard_option.selectedIndex
    if (pcwizard_option.selectedIndex == 0){//1st
        input_queue.value = `*!,*p4`
    }
    else if (pcwizard_option.selectedIndex == 1){//2nd
        input_queue.value = `[${pcwizard_queue.value}]!,*!`
    }
    else if (pcwizard_option.selectedIndex == 2){//3nd
        input_queue.value = `[${pcwizard_queue.value}]!,*!,*p3`
    }
    else if (pcwizard_option.selectedIndex == 3){//4th
        input_queue.value = `[${pcwizard_queue.value}]!,*p6`
    }
    else if (pcwizard_option.selectedIndex == 4){//5th
        input_queue.value = `[${pcwizard_queue.value}]!,*!,*p2`
    }
    else if (pcwizard_option.selectedIndex == 5){//6th
        input_queue.value = `[${pcwizard_queue.value}]!,*p5`
    }
    else if (pcwizard_option.selectedIndex == 6){//7th
        input_queue.value = `[${pcwizard_queue.value}]!,*!`
    }
    document.getElementById('field').value = ''
}

/*
5. start
*/

set_event_listener()
load_setting()
update_keybind()



function initialize(){
    
    
    var temp = sessionStorage.getItem('temp')
    sessionStorage.removeItem('temp')
    if (temp != null){
        document.getElementById('input13').innerHTML = '<option value="customized">customized</option>'
        save_gamemode()
        document.getElementById('customized').hidden = false

        var [f,q] = temp.split('=')
        document.getElementById("input_queue").value = q
        document.getElementById("field").value = f.length>0? f.match(/.{10}/g).join('\n'): ''
        play_a_map()
        console.log('loading customized map')
    }
    else{
        setTimeout(load_gamemode,1500)
        setTimeout(play_a_map, 1500)
    }
}

initialize()