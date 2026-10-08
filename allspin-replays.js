// All-Spin from replays: read TETR.IO replays (in allspin-replays-worker.mjs), keep
// the spins found as exercises in the browser, and play them on the All-Spin page.
const LIBRARY_KEY = 'allspin_pro'
const LINE_WORDS = ['', 'Single', 'Double', 'Triple', 'Quad']

function load_library(){
    try{
        var data = JSON.parse(localStorage.getItem(LIBRARY_KEY))
        if (data && Array.isArray(data.exercises)){
            data.timelines = data.timelines || {}
            return data
        }
    }
    catch(err){}
    return {sources: [], exercises: [], timelines: {}}
}
// a round of one player: its timeline's key in the library
const round_key = s => [s.file, s.round, s.username].join('|')
function save_library(lib){
    try{ localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)); return true }
    catch(err){ status('Not enough room in this browser to keep all of them.'); return false }
}
const exercise_id = e => [e.source.file, e.source.round, e.source.username, e.source.placement, (e.spins || [1]).length].join(':')
// an exercise's spins (one or more in a row; older ones kept a single `spin`)
const spins_of = e => e.spins || [e.spin]
const one_label = s => s.piece + '-Spin' + (s.kind == 'mini' && s.piece == 'T'? ' Mini': '') + ' ' + LINE_WORDS[s.lines]
const spin_label = e => spins_of(e).map(one_label).join(' → ')
function status(text){ document.getElementById('status').textContent = text }

/*
Reading replays
*/
var found = []     // [{file, results}] waiting for "Add"
var worker = null

document.getElementById('files').onchange = async e => {
    var files = [...e.target.files]
    e.target.value = ''
    if (!files.length) return
    found = []
    document.getElementById('found').hidden = true
    if (!worker) worker = new Worker('allspin-replays-worker.mjs', {type: 'module'})
    for (var [i, file] of files.entries()){
        status('Reading ' + file.name + (files.length > 1? ' (' + (i + 1) + '/' + files.length + ')': '') + '… a match takes a few seconds')
        var text = await file.text()
        var answer = await new Promise(resolve => {
            worker.onmessage = m => resolve(m.data)
            worker.onerror = err => resolve({file: file.name, error: err.message || 'could not read it'})
            worker.postMessage({text: text, file: file.name})
        })
        if (answer.error) status(file.name + ': ' + friendly(answer.error))
        else found.push(answer)
    }
    show_found()
}

function friendly(error){
    if (/UNSUPPORTED_MODE|Unsupported profile|gamemode/i.test(error)) return 'only Tetra League (.ttrm) and 40 Lines (.ttr) replays can be read'
    if (/version/i.test(error)) return 'this replay is from another TETR.IO version, which can\'t be read'
    if (/JSON|MALFORMED/i.test(error)) return 'this isn\'t a TETR.IO replay file'
    return error
}

function show_found(){
    var rows = document.getElementById('found-rows')
    rows.textContent = ''
    var by_player = {}
    for (var f of found)
        for (var r of f.results){
            var key = f.file + '\n' + r.username
            var p = by_player[key] = by_player[key] || {file: f.file, username: r.username, rounds: 0, spins: 0, partly: 0}
            p.rounds += 1
            p.spins += r.exercises.length
            if (r.diverged || r.error) p.partly += 1
        }
    var list = Object.values(by_player)
    if (!list.length){ return }
    for (var p of list){
        var tr = document.createElement('tr')
        var box = document.createElement('input')
        box.type = 'checkbox'
        box.checked = p.spins > 0
        box.dataset.key = p.file + '\n' + p.username
        var td = document.createElement('td'); td.appendChild(box); tr.appendChild(td)
        for (var text of [p.username + (found.length > 1? ' (' + p.file + ')': ''), p.rounds, p.spins, p.partly? p.partly + ' of ' + p.rounds: '–']){
            var cell = document.createElement('td'); cell.textContent = text; tr.appendChild(cell)
        }
        rows.appendChild(tr)
    }
    document.getElementById('found').hidden = false
    status('Found ' + list.reduce((a, p) => a + p.spins, 0) + ' spins. Choose whose to keep.')
}

document.getElementById('add').onclick = () => {
    var keep = new Set([...document.querySelectorAll('#found-rows input:checked')].map(b => b.dataset.key))
    var lib = load_library()
    var have = new Set(lib.exercises.map(exercise_id))
    var added = 0
    for (var f of found){
        var players = new Set()
        for (var r of f.results){
            if (!keep.has(f.file + '\n' + r.username)) continue
            players.add(r.username)
            if (r.timeline) lib.timelines[round_key({file: f.file, round: r.round, username: r.username})] = r.timeline
            for (var e of r.exercises){
                if (have.has(exercise_id(e))) continue
                have.add(exercise_id(e))
                lib.exercises.push(e)
                added += 1
            }
        }
        if (players.size && !lib.sources.some(s => s.file == f.file))
            lib.sources.push({file: f.file, players: [...players], added: Date.now()})
    }
    if (save_library(lib)){
        status(added + ' exercises added.')
        document.getElementById('found').hidden = true
        found = []
        show_library()
    }
}

/*
The library
*/
// your results on the All-Spin page: {id: [solved, tries]}
function load_results(){
    try{ return JSON.parse(localStorage.getItem('allspin_pro_results')) || {} }
    catch(err){ return {} }
}

function filtered(lib){
    var results = load_results()
    var how = document.getElementById('filter-results').value
    var player = document.getElementById('filter-player').value
    var piece = document.getElementById('filter-piece').value
    var lines = document.getElementById('filter-lines').value
    var size = document.getElementById('filter-size').value
    var count = document.getElementById('filter-count').value
    // from a round on (of that replay): "file|round"
    var from = document.getElementById('filter-round').value
    var from_file = from && from.slice(0, from.lastIndexOf('|')), from_round = from && Number(from.slice(from.lastIndexOf('|') + 1))
    return lib.exercises.filter(e => {
        if (from && (e.source.file != from_file || e.source.round < from_round)) return false
        if (how){
            var [solved, tries] = results[exercise_id(e)] || [0, 0]
            if (how == 'new' && tries) return false
            if (how == 'unsolved' && solved) return false
            if (how == 'missed' && solved == tries) return false
        }
        if (player && e.source.username != player) return false
        if (piece && !spins_of(e).some(s => s.piece == piece)) return false
        if (lines && !spins_of(e).some(s => s.lines == lines)) return false
        if (count && (count == '1') != (spins_of(e).length == 1)) return false
        if (size){
            var [lo, hi] = size.split('-').map(Number)
            if (e.queue.length < lo || e.queue.length > hi) return false
        }
        return true
    })
}

function show_library(){
    var lib = load_library()
    var any = lib.exercises.length > 0
    for (var id of ['library-section', 'reference-section', 'sources-section']) document.getElementById(id).hidden = !any
    if (!any) return

    // players in the filter
    var select = document.getElementById('filter-player')
    var chosen = select.value
    select.length = 1
    for (var name of [...new Set(lib.exercises.map(e => e.source.username))].sort()){
        var option = document.createElement('option')
        option.textContent = name
        select.appendChild(option)
    }
    select.value = chosen

    // rounds in the "from round" filter
    var rounds = document.getElementById('filter-round')
    var picked = rounds.value
    rounds.length = 1
    var files = [...new Set(lib.exercises.map(e => e.source.file))]
    var seen = new Set()
    for (var e of [...lib.exercises].sort((a, b) => a.source.file.localeCompare(b.source.file) || a.source.round - b.source.round)){
        var value = e.source.file + '|' + e.source.round
        if (seen.has(value)) continue
        seen.add(value)
        var option = document.createElement('option')
        option.value = value
        option.textContent = 'Round ' + (e.source.round + 1) + (files.length > 1? ' (' + e.source.file + ')': '')
        rounds.appendChild(option)
    }
    rounds.value = picked

    // summary
    var cards = document.getElementById('cards')
    cards.textContent = ''
    var all_spins = lib.exercises.flatMap(spins_of)
    var t = all_spins.filter(s => s.piece == 'T').length
    var chains = lib.exercises.filter(e => spins_of(e).length > 1).length
    var results = load_results()
    var done = lib.exercises.filter(e => (results[exercise_id(e)] || [0])[0] > 0).length
    for (var [label, value] of [['Exercises', lib.exercises.length], ['Solved', done + ' of ' + lib.exercises.length],
                                 ['Spins in a row', chains], ['T-spins', t], ['Other spins', all_spins.length - t]]){
        var card = document.createElement('div')
        card.className = 'stat-card'
        card.innerHTML = '<span class="stat-label"></span><strong class="stat-value"></strong>'
        card.querySelector('.stat-label').textContent = label
        card.querySelector('.stat-value').textContent = value
        cards.appendChild(card)
    }

    // the grid
    var list = filtered(lib)
    document.getElementById('shown').textContent = list.length + ' shown'
    var grid = document.getElementById('grid')
    grid.textContent = ''
    for (var e of list.slice(0, 300)){
        var item = document.createElement('button')
        item.type = 'button'
        item.className = 'pro-card'
        item.title = 'Watch how it was built, then play it'
        var canvas = document.createElement('canvas')
        draw_preview(canvas, e)
        var label = document.createElement('span')
        label.className = 'pro-label'
        label.textContent = spin_label(e) + ' · ' + e.queue.length + ' pieces'
        var [solved, tries] = load_results()[exercise_id(e)] || [0, 0]
        if (tries){
            var mark = document.createElement('span')
            mark.className = 'pro-result ' + (solved? 'won': 'lost')
            mark.textContent = (solved? '✓ ': '✗ ') + solved + '/' + tries
            mark.title = 'Solved ' + solved + ' of ' + tries + ' tries'
            item.appendChild(mark)
        }
        var who = document.createElement('span')
        who.className = 'pro-who'
        who.textContent = e.source.username + ' · round ' + (e.source.round + 1)
        item.append(canvas, label, who)
        item.onclick = (ex => () => watch(ex))(e)
        grid.appendChild(item)
    }
    if (list.length > 300){
        var more = document.createElement('p')
        more.className = 'stats-note'
        more.textContent = 'Showing 300 of ' + list.length + ': narrow the filters to see the others (Play these takes them all).'
        grid.appendChild(more)
    }

    // reference: by spin kind
    var kinds = {}
    for (var e of lib.exercises)
        for (var s of spins_of(e)){
            var k = kinds[one_label(s)] = kinds[one_label(s)] || {count: 0, pieces: 0}
            k.count += 1
            k.pieces += s.build.length
        }
    var rows = document.getElementById('reference-rows')
    rows.textContent = ''
    for (var [name, k] of Object.entries(kinds).sort((a, b) => b[1].count - a[1].count)){
        var tr = document.createElement('tr')
        for (var text of [name, k.count, (k.pieces / k.count).toFixed(1)]){
            var td = document.createElement('td'); td.textContent = text; tr.appendChild(td)
        }
        rows.appendChild(tr)
    }

    // replays
    var sources = document.getElementById('sources-rows')
    sources.textContent = ''
    for (var s of lib.sources){
        var tr = document.createElement('tr')
        var n = lib.exercises.filter(e => e.source.file == s.file).length
        for (var text of [s.file, s.players.join(', '), n]){
            var td = document.createElement('td'); td.textContent = text; tr.appendChild(td)
        }
        var td = document.createElement('td')
        var remove = document.createElement('button')
        remove.type = 'button'
        remove.className = 'install-button danger'
        remove.textContent = 'Remove'
        remove.onclick = (file => () => {
            if (!confirm('Remove the exercises from ' + file + '?')) return
            var lib = load_library()
            lib.exercises = lib.exercises.filter(e => e.source.file != file)
            lib.sources = lib.sources.filter(s => s.file != file)
            for (var key of Object.keys(lib.timelines)) if (key.startsWith(file + '|')) delete lib.timelines[key]
            save_library(lib)
            show_library()
        })(s.file)
        td.appendChild(remove)
        tr.appendChild(td)
        sources.appendChild(tr)
    }
}

// the board, the setup dashed, the slot outlined
function draw_preview(canvas, e){
    var size = 9, dpr = Math.min(window.devicePixelRatio || 1, 3)
    var top = 0
    e.board.forEach((row, r) => { if (row != 'NNNNNNNNNN') top = r })
    // (the first spin: the later ones are on the board it leaves)
    var first = spins_of(e)[0]
    first.cells.forEach(([c, r]) => top = Math.max(top, r))
    var rows = Math.max(8, Math.min(20, top + 3))
    canvas.width = 10 * size * dpr
    canvas.height = rows * size * dpr
    canvas.style.width = 10 * size + 'px'
    canvas.style.height = rows * size + 'px'
    var ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 10 * size, rows * size)
    var y = r => (rows - 1 - r) * size
    e.board.forEach((row, r) => {
        if (r >= rows) return
        ;[...row].forEach((c, col) => {
            if (c == 'N') return
            ctx.fillStyle = c == 'G'? '#888': color_table[c]
            ctx.fillRect(col * size, y(r), size - 1, size - 1)
        })
    })
    ctx.lineWidth = 1
    for (var p of first.build){
        ctx.strokeStyle = color_table[p.piece]
        for (var [col, r] of p.cells) if (r < rows) ctx.strokeRect(col * size + 1.5, y(r) + 1.5, size - 4, size - 4)
    }
    ctx.fillStyle = color_table[first.piece]
    ctx.globalAlpha = 0.6
    for (var [col, r] of first.cells) if (r < rows) ctx.fillRect(col * size, y(r), size - 1, size - 1)
    ctx.globalAlpha = 1
}

/*
Watch: the exercise step by step as the player built it. Each setup piece in the
order they placed it (the new one outlined), then the spin (its slot shown first),
then the lines clearing, and the next setup. Arrows or the buttons step; Play runs it.
*/
function watch_steps(e){
    var board = e.board.map(row => [...row])
    var copy = () => board.map(row => [...row])
    var steps = [{board: copy(), text: 'Start: the board ' + (e.queue.length) + ' pieces before'}]
    spins_of(e).forEach((s, n) => {
        var setup = [...s.build].reverse()
        setup.forEach((p, i) => {
            for (var [c, r] of p.cells) board[r][c] = p.piece
            steps.push({board: copy(), outline: p.cells, color: p.piece,
                text: 'Setup ' + (i + 1) + '/' + setup.length + ': ' + p.piece})
        })
        steps.push({board: copy(), slot: s.cells, color: s.piece, text: 'The slot: ' + one_label(s)})
        for (var [c, r] of s.cells) board[r][c] = s.piece
        steps.push({board: copy(), outline: s.cells, color: s.piece, text: one_label(s) + '!'})
        var rows = board.filter(row => row.some(c => c == 'N'))
        while (rows.length < 20) rows.push(Array(10).fill('N'))
        board = rows
        steps.push({board: copy(), text: (n + 1 < spins_of(e).length? 'Lines cleared, next setup': 'Done')})
    })
    return steps
}

var viewer = null
function watch(e){
    var steps = watch_steps(e)
    // the same height for every step: the tallest board, plus room above
    var top = 0
    for (var st of steps) st.board.forEach((row, r) => { if (row.some(c => c != 'N')) top = Math.max(top, r) })
    var rows = Math.min(20, Math.max(10, top + 3))
    if (!viewer){
        viewer = document.createElement('div')
        viewer.className = 'pro-viewer'
        viewer.innerHTML = '<div class="pro-viewer-box" role="dialog" aria-label="Watch the setup">' +
            '<p class="pro-viewer-title"></p><canvas></canvas><p class="pro-viewer-text" role="status"></p>' +
            '<div class="pro-viewer-buttons"><button type="button" data-do="prev" title="Back (←)">◀</button>' +
            '<button type="button" data-do="auto" title="Play the steps">▶▶</button>' +
            '<button type="button" data-do="next" title="Next (→)">▶</button></div>' +
            '<div class="pro-viewer-buttons"><button type="button" class="install-button" data-do="play">Play this exercise</button>' +
            '<button type="button" class="install-button" data-do="from" title="Play in order from this exercise: the game goes on to the next ones">Play from here</button>' +
            '<button type="button" class="install-button" data-do="close">Close</button></div></div>'
        document.body.appendChild(viewer)
        viewer.addEventListener('click', ev => {
            if (ev.target == viewer) return close_viewer()
            var what = ev.target.dataset && ev.target.dataset.do
            if (what == 'prev') viewer.go(-1)
            if (what == 'next') viewer.go(1)
            if (what == 'auto') viewer.auto()
            if (what == 'play') play([viewer.exercise])
            if (what == 'from') play_from(viewer.exercise)
            if (what == 'close') close_viewer()
        })
        document.addEventListener('keydown', ev => {
            if (!viewer || viewer.hidden) return
            if (ev.key == 'ArrowLeft') viewer.go(-1)
            else if (ev.key == 'ArrowRight') viewer.go(1)
            else if (ev.key == 'Escape') close_viewer()
            else return
            ev.preventDefault()
        })
    }
    var at = 0, timer = null
    viewer.exercise = e
    viewer.querySelector('.pro-viewer-title').textContent = spin_label(e) + ' · ' + e.source.username + ', round ' + (e.source.round + 1)
    var show = () => {
        draw_step(viewer.querySelector('canvas'), steps[at], rows)
        viewer.querySelector('.pro-viewer-text').textContent = (at + 1) + '/' + steps.length + ' · ' + steps[at].text
    }
    viewer.go = d => {
        clearInterval(timer); timer = null
        at = Math.max(0, Math.min(steps.length - 1, at + d))
        show()
    }
    viewer.auto = () => {
        clearInterval(timer)
        if (at == steps.length - 1) at = 0
        show()
        timer = setInterval(() => {
            if (at >= steps.length - 1){ clearInterval(timer); timer = null; return }
            at += 1
            show()
        }, 700)
    }
    viewer.stop = () => { clearInterval(timer); timer = null }
    viewer.hidden = false
    show()
}
function close_viewer(){
    if (!viewer) return
    viewer.stop()
    viewer.hidden = true
}

function draw_step(canvas, step, rows){
    var size = Math.floor(Math.min(24, (window.innerHeight - 230) / rows, (window.innerWidth - 60) / 10))
    var dpr = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = 10 * size * dpr
    canvas.height = rows * size * dpr
    canvas.style.width = 10 * size + 'px'
    canvas.style.height = rows * size + 'px'
    var ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 10 * size, rows * size)
    var y = r => (rows - 1 - r) * size
    ctx.strokeStyle = '#222'
    for (var r=0; r<rows; r++) for (var c=0; c<10; c++) ctx.strokeRect(c * size + 0.5, y(r) + 0.5, size - 1, size - 1)
    step.board.forEach((row, r) => {
        if (r >= rows) return
        row.forEach((cell, c) => {
            if (cell == 'N') return
            ctx.fillStyle = cell == 'G'? '#888': color_table[cell]
            ctx.fillRect(c * size, y(r), size - 1, size - 1)
        })
    })
    if (step.slot){
        ctx.globalAlpha = 0.35
        ctx.fillStyle = color_table[step.color]
        for (var [c, r] of step.slot) ctx.fillRect(c * size, y(r), size - 1, size - 1)
        ctx.globalAlpha = 1
        ctx.setLineDash([4, 3])
    }
    var cells = step.slot || step.outline
    if (cells){
        ctx.lineWidth = 3
        ctx.strokeStyle = '#fff'
        for (var [c, r] of cells) ctx.strokeRect(c * size + 2, y(r) + 2, size - 5, size - 5)
        ctx.setLineDash([])
    }
}

// Play a list on the All-Spin page (it reads the list from this tab's session)
function play(list){
    var ids = list.map(exercise_id)
    try{ sessionStorage.setItem('allspin_pro_play', JSON.stringify(ids)) }catch(err){}
    location.href = 'allspin-practice.html#pro'
}
// in the order of the games: from one exercise to the next of the same round, the
// All-Spin page plays the player's game in between
function in_order(list){
    return list.sort((a, b) => a.source.file.localeCompare(b.source.file) || a.source.round - b.source.round ||
        String(a.source.username).localeCompare(String(b.source.username)) || (a.source.first ?? a.source.placement) - (b.source.first ?? b.source.placement))
}
document.getElementById('play-order').onclick = () => {
    var list = in_order(filtered(load_library()))
    if (list.length) play(list)
}
// Play in order from one exercise (Watch): it, then the ones after it, then the
// ones before
function play_from(e){
    var list = in_order(filtered(load_library()))
    var i = list.findIndex(x => exercise_id(x) == exercise_id(e))
    if (i < 0){ list = in_order(load_library().exercises); i = list.findIndex(x => exercise_id(x) == exercise_id(e)) }
    play(list.slice(i).concat(list.slice(0, i)))
}
document.getElementById('play-all').onclick = () => {
    var list = filtered(load_library())
    for (var i=list.length-1; i>0; i--){ var j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]] }
    if (list.length) play(list)
}
for (var id of ['filter-results', 'filter-round', 'filter-player', 'filter-piece', 'filter-lines', 'filter-count', 'filter-size'])
    document.getElementById(id).onchange = show_library

show_library()
