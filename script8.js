
var game = new Game();
var Config = {'das':100, 'arr':0, 'delay':0, 'pressing_left':false, 'pressing_right': false, 'pressing_down': false, 'pressing':{},
'skim_ind':true, 'mdhole_ind':false, 'unqiue_ind':true, 'auto_next_ind':true,
'mode':'1', 'no_of_unreserved_piece':7, 'no_of_piece':7,
'no_of_trial':0, 'no_of_success':0}


function clone2d(arr){
    var newarr = []
    for (var sub_arr of arr){
        newarr.push([...sub_arr])
    }
    return newarr
}
fetch('./learnfromai.json')
.then(results=>results.json())
.then(d=>{jsondata = d;console.log('loading')})


/*
0. sound effect
*/
    

/*
1. html related
*/



function load_level(modname){
    Config.mode = modname
    localStorage.setItem('current_level', modname)
    play_a_map()
    document.getElementById('input13').innerHTML = jsondata[modname]['display_name'];
}

function load_jsondata(){

    var passed_level_list = JSON.parse(localStorage.getItem('passed_level'))
    if (passed_level_list == null) passed_level_list = []


    var text = ''
    for (var modname in jsondata){
        label = passed_level_list.includes(modname)? "✅": " "
        color = passed_level_list.includes(modname)? "green": "red"; console.log(color,typeof(modname))
        display_name = jsondata[modname]["display_name"]
        text += `<button class="game_button ${color}" onclick='load_level("${modname}"); board.focus()'>${display_name}${label}</button>`
    }
    document.getElementById('scrollable').innerHTML = text
}



function save_gamemode(){
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
    tsd: 0,
    quadL: 0,
    pc: 0,
    max_combo: 0,

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
    Record.tsd = Record.quad = Record.pc = Record.max_combo = 0
    game = new Game()
    game.board = clone(Record.finished_map)

    game.bag = Record.piece_added.concat(['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G'])
    game.update()
    game.holdmino = ''
    game.hold()
    
}



function play_a_map(){
    mode = Config.mode
    game = new Game()
    if (jsondata[mode]['winning_requirement']["max_combo"] > 0)
        document.getElementById('winning_requirement1').innerHTML = jsondata[mode]['winning_requirement']["max_combo"]+' Combo'
    else
        document.getElementById('winning_requirement1').innerHTML = ''
    if (jsondata[mode]['winning_requirement']["tsd"] > 0)
        document.getElementById('winning_requirement2').innerHTML = jsondata[mode]['winning_requirement']["tsd"]+' Tspin Double'
    else
        document.getElementById('winning_requirement2').innerHTML = ''
    if (jsondata[mode]['winning_requirement']["quad"] > 0)
        document.getElementById('winning_requirement3').innerHTML = jsondata[mode]['winning_requirement']["quad"]+' Quad'
    else
        document.getElementById('winning_requirement3').innerHTML = ''
    if (jsondata[mode]['winning_requirement']["pc"] > 0)
        document.getElementById('winning_requirement4').innerHTML = jsondata[mode]['winning_requirement']["pc"]+' Perfect Clear'
    else
        document.getElementById('winning_requirement4').innerHTML = ''

    Config.no_of_piece = jsondata[mode]["no_of_piece"]
    game.board = clone2d(jsondata[mode]['board']).reverse()
    Record.finished_map = clone(game.board)
    Record.piece_added = [...jsondata[mode]['queue']]


    play()
    render()

}





function detect_win(){
    if (game.total_piece == 1){
        Config.no_of_trial += 1
    }
    mode = Config.mode
    if (game.line_clear == 2 && game.b2b >= 0) Record.tsd++
    if (game.line_clear == 4) Record.quad++
    if (game.pc) Record.pc ++
    if (game.combo > Record.max_combo) Record.max_combo = game.combo
    if (game.total_piece == Config.no_of_piece){
        if (Record.tsd >= jsondata[mode]["winning_requirement"]['tsd'] &&
            Record.quad >= jsondata[mode]["winning_requirement"]['quad'] &&
            Record.pc >= jsondata[mode]["winning_requirement"]['pc'] &&
            Record.max_combo >= jsondata[mode]["winning_requirement"]['max_combo']){
                sound['win'].play()
                if (Config.auto_next_ind){
                    play_a_map()}
                Config.no_of_success += 1
                var passed_level_list = JSON.parse(localStorage.getItem('passed_level'))
                if (passed_level_list == null)
                    passed_level_list = []
                if(!passed_level_list.includes(Config.mode))
                    localStorage.setItem('passed_level', JSON.stringify(passed_level_list.concat(Config.mode)))
                load_jsondata()
            }

        else{
                sound['lose'].play()
                retry()   
        }
    }

}


function show_ans(){

    
}








/*
5. start
*/

set_event_listener()
load_setting()
update_keybind()



function initialize(){
    
    

    load_jsondata()

    var current_level = localStorage.getItem('current_level')
    if (current_level == null) current_level = "1"
    try{
        load_level(current_level)
    }
    catch(err){
        load_level('1')
    }
    
}

setTimeout(initialize,1000)