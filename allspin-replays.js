// All-Spin from replays: read TETR.IO replays (in allspin-replays-worker.mjs), keep
// the spins found as exercises in the browser, and play them on the All-Spin page.
const LIBRARY_KEY = 'allspin_pro'
const LINE_WORDS = ['', 'Single', 'Double', 'Triple', 'Quad']

function load_library(){
    try{
        var data = JSON.parse(localStorage.getItem(LIBRARY_KEY))
        if (data && Array.isArray(data.exercises)) return data
    }
    catch(err){}
    return {sources: [], exercises: []}
}
function save_library(lib){
    try{ localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)); return true }
    catch(err){ status('Not enough room in this browser to keep all of them.'); return false }
}
const exercise_id = e => [e.source.file, e.source.round, e.source.username, e.source.placement].join(':')
const spin_label = e => e.spin.piece + '-Spin' + (e.spin.kind == 'mini' && e.spin.piece == 'T'? ' Mini': '') + ' ' + LINE_WORDS[e.spin.lines]
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
function filtered(lib){
    var player = document.getElementById('filter-player').value
    var piece = document.getElementById('filter-piece').value
    var lines = document.getElementById('filter-lines').value
    var size = document.getElementById('filter-size').value
    return lib.exercises.filter(e => {
        if (player && e.source.username != player) return false
        if (piece && e.spin.piece != piece) return false
        if (lines && e.spin.lines != lines) return false
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

    // summary
    var cards = document.getElementById('cards')
    cards.textContent = ''
    var t = lib.exercises.filter(e => e.spin.piece == 'T').length
    for (var [label, value] of [['Exercises', lib.exercises.length], ['T-spins', t], ['Other spins', lib.exercises.length - t],
                                 ['Replays', lib.sources.length]]){
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
        item.title = 'Play this one'
        var canvas = document.createElement('canvas')
        draw_preview(canvas, e)
        var label = document.createElement('span')
        label.className = 'pro-label'
        label.textContent = spin_label(e) + ' · ' + e.queue.length + ' pieces'
        var who = document.createElement('span')
        who.className = 'pro-who'
        who.textContent = e.source.username + ' · round ' + (e.source.round + 1)
        item.append(canvas, label, who)
        item.onclick = (ex => () => play([ex]))(e)
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
    for (var e of lib.exercises){
        var k = kinds[spin_label(e)] = kinds[spin_label(e)] || {count: 0, pieces: 0}
        k.count += 1
        k.pieces += e.queue.length - 1
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
    e.spin.cells.forEach(([c, r]) => top = Math.max(top, r))
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
    for (var p of e.spin.build){
        ctx.strokeStyle = color_table[p.piece]
        for (var [col, r] of p.cells) if (r < rows) ctx.strokeRect(col * size + 1.5, y(r) + 1.5, size - 4, size - 4)
    }
    ctx.fillStyle = color_table[e.spin.piece]
    ctx.globalAlpha = 0.6
    for (var [col, r] of e.spin.cells) if (r < rows) ctx.fillRect(col * size, y(r), size - 1, size - 1)
    ctx.globalAlpha = 1
}

// Play a list on the All-Spin page (it reads the list from this tab's session)
function play(list){
    var ids = list.map(exercise_id)
    try{ sessionStorage.setItem('allspin_pro_play', JSON.stringify(ids)) }catch(err){}
    location.href = 'allspin-practice.html#pro'
}
document.getElementById('play-all').onclick = () => {
    var list = filtered(load_library())
    for (var i=list.length-1; i>0; i--){ var j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]] }
    if (list.length) play(list)
}
for (var id of ['filter-player', 'filter-piece', 'filter-lines', 'filter-size'])
    document.getElementById(id).onchange = show_library

show_library()
