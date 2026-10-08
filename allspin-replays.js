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
    var added = 0, updated = 0
    for (var f of found){
        var players = new Set()
        for (var r of f.results){
            if (!keep.has(f.file + '\n' + r.username)) continue
            players.add(r.username)
            if (r.timeline) lib.timelines[round_key({file: f.file, round: r.round, username: r.username})] = r.timeline
            for (var e of r.exercises){
                // (already there: replaced, so it gets what newer versions of this page
                // read from replays; your results are kept, by id)
                if (have.has(exercise_id(e))){
                    var at = lib.exercises.findIndex(x => exercise_id(x) == exercise_id(e))
                    if (at >= 0){ lib.exercises[at] = e; updated += 1 }
                    continue
                }
                have.add(exercise_id(e))
                lib.exercises.push(e)
                added += 1
            }
        }
        if (players.size && !lib.sources.some(s => s.file == f.file))
            lib.sources.push({file: f.file, players: [...players], added: Date.now()})
    }
    if (save_library(lib)){
        status(added + ' exercises added' + (updated? ', ' + updated + ' updated': '') + '.')
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

// The spin piece you miss most in these exercises (misses per try, 3 tries at
// least), or null
function weakest_piece(lib, results){
    var by = {}
    for (var e of lib.exercises){
        var [solved, tries] = results[exercise_id(e)] || [0, 0]
        if (!tries) continue
        for (var p of new Set(spins_of(e).map(s => s.piece))){
            var b = by[p] = by[p] || {miss: 0, tries: 0}
            b.miss += tries - solved
            b.tries += tries
        }
    }
    var best = null
    for (var [p, b] of Object.entries(by))
        if (b.tries >= 3 && b.miss > 0 && (!best || b.miss / b.tries > by[best].miss / by[best].tries)) best = p
    return best
}

// How hard an exercise is, 1 (easy) to 3 (hard): more pieces, spins in a row, a
// tall board, triples and non-T spins make it harder
const LEVELS = ['', 'Easy', 'Medium', 'Hard']
function difficulty(e){
    var spins = spins_of(e), height = 0
    e.board.forEach((row, r) => { if (row != 'NNNNNNNNNN') height = r + 1 })
    var score = e.queue.length + 2 * (spins.length - 1) + (height >= 12? 2: height >= 8? 1: 0) +
        spins.filter(s => s.lines == 3 || s.piece != 'T').length
    return score <= 5? 1: score <= 10? 2: 3
}

// favourites: the ids starred in Watch
function load_favs(){
    try{ return new Set(JSON.parse(localStorage.getItem('allspin_pro_favs')) || []) }
    catch(err){ return new Set() }
}
function save_favs(favs){
    try{ localStorage.setItem('allspin_pro_favs', JSON.stringify([...favs])) }catch(err){}
}

function filtered(lib){
    var results = load_results()
    var how = document.getElementById('filter-results').value
    var player = document.getElementById('filter-player').value
    var piece = document.getElementById('filter-piece').value
    if (piece == 'weak') piece = weakest_piece(lib, results) || ''
    var lines = document.getElementById('filter-lines').value
    var size = document.getElementById('filter-size').value
    var count = document.getElementById('filter-count').value
    var level = document.getElementById('filter-level').value
    // from a round on (of that replay): "file|round"
    var from = document.getElementById('filter-round').value
    var from_file = from && from.slice(0, from.lastIndexOf('|')), from_round = from && Number(from.slice(from.lastIndexOf('|') + 1))
    var favs = load_favs()
    return lib.exercises.filter(e => {
        if (from && (e.source.file != from_file || e.source.round < from_round)) return false
        if (how == 'fav' && !favs.has(exercise_id(e))) return false
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
        if (level && difficulty(e) != level) return false
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
    for (var id of ['library-section', 'players-section', 'reference-section', 'sources-section']) document.getElementById(id).hidden = !any
    // with exercises, they come first: the introduction folds away and adding a
    // replay moves to the end
    document.getElementById('intro').hidden = any
    var main = document.querySelector('main'), add = document.getElementById('add-section')
    if (any) main.appendChild(add)
    else main.insertBefore(add, document.getElementById('library-section'))
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
    // today, and the days in a row with something solved (today or up to yesterday)
    var days = {}
    try{ days = JSON.parse(localStorage.getItem('allspin_pro_days')) || {} }catch(err){}
    var day_of = t => { var d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
    var today = days[day_of(Date.now())] || [0, 0], streak = 0
    for (var k = (today[0]? 0: 1); (days[day_of(Date.now() - k * 864e5)] || [0])[0] > 0; k++) streak += 1
    for (var [label, value] of [['Today', today[0] + ' solved'], ['Streak', streak + (streak == 1? ' day': ' days')],
                                 ['Exercises', lib.exercises.length], ['Solved', done + ' of ' + lib.exercises.length],
                                 ['Spins in a row', chains], ['T-spins', t], ['Other spins', all_spins.length - t]]){
        var card = document.createElement('div')
        card.className = 'stat-card'
        card.innerHTML = '<span class="stat-label"></span><strong class="stat-value"></strong>'
        card.querySelector('.stat-label').textContent = label
        card.querySelector('.stat-value').textContent = value
        cards.appendChild(card)
    }

    // "My weakest": which piece it is now
    var weak = weakest_piece(lib, load_results())
    var option = document.querySelector('#filter-piece option[value="weak"]')
    option.textContent = weak? 'My weakest (' + weak + ')': 'My weakest (play some first)'
    option.disabled = !weak

    // a shortcut to the ones you miss
    var missed = misses(lib).length
    var button = document.getElementById('play-misses')
    button.hidden = !missed
    button.textContent = 'Practise my misses (' + missed + ')'

    // the grid
    var favs = load_favs()
    var list = sorted(filtered(lib))
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
        var lv = document.createElement('span')
        lv.className = 'pro-level level' + difficulty(e)
        lv.textContent = LEVELS[difficulty(e)]
        item.appendChild(lv)
        var [solved, tries, best] = load_results()[exercise_id(e)] || [0, 0]
        if (tries || favs.has(exercise_id(e))){
            var mark = document.createElement('span')
            mark.className = 'pro-result ' + (solved? 'won': 'lost')
            mark.textContent = (favs.has(exercise_id(e))? '★ ': '') + (tries? (solved? '✓ ': '✗ ') + solved + '/' + tries: '') +
                (best? ' · ' + best + ' s': '')
            mark.title = (tries? 'Solved ' + solved + ' of ' + tries + ' tries': '') + (best? ', best ' + best + ' s': '')
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

    // your results by player
    var players = {}
    for (var e of lib.exercises){
        var p = players[e.source.username] = players[e.source.username] || {n: 0, tried: 0, solved: 0}
        var [solved, tries] = results[exercise_id(e)] || [0, 0]
        p.n += 1
        if (tries) p.tried += 1
        if (solved) p.solved += 1
    }
    var prow = document.getElementById('player-rows')
    prow.textContent = ''
    for (var [name, p] of Object.entries(players)){
        var tr = document.createElement('tr')
        for (var text of [name, p.n, p.tried, p.solved, p.tried? Math.round(100 * p.solved / p.tried) + '%': '–']){
            var td = document.createElement('td'); td.textContent = text; tr.appendChild(td)
        }
        prow.appendChild(tr)
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
    // (placed: how many pieces of the queue are on the board)
    var placed = 0
    var steps = [{board: copy(), placed: 0, text: 'Start: the board ' + (e.queue.length) + ' pieces before'}]
    spins_of(e).forEach((s, n) => {
        var setup = [...s.build].reverse()
        setup.forEach((p, i) => {
            for (var [c, r] of p.cells) board[r][c] = p.piece
            placed += 1
            steps.push({board: copy(), outline: p.cells, color: p.piece, placed: placed,
                text: 'Setup ' + (i + 1) + '/' + setup.length + ': ' + p.piece})
        })
        steps.push({board: copy(), slot: s.cells, color: s.piece, placed: placed, text: 'The slot: ' + one_label(s)})
        for (var [c, r] of s.cells) board[r][c] = s.piece
        placed += 1
        steps.push({board: copy(), outline: s.cells, color: s.piece, placed: placed, text: one_label(s) + '!'})
        var rows = board.filter(row => row.some(c => c == 'N'))
        while (rows.length < 20) rows.push(Array(10).fill('N'))
        board = rows
        steps.push({board: copy(), placed: placed, text: (n + 1 < spins_of(e).length? 'Lines cleared, next setup': 'Done')})
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
            '<p class="pro-viewer-title"></p><canvas></canvas><div class="pro-queue" aria-label="The pieces, in the order placed"></div><p class="pro-viewer-text" role="status"></p>' +
            '<div class="pro-viewer-buttons"><button type="button" data-do="prev-ex" title="The exercise before (in the list shown)">⏮</button>' +
            '<button type="button" data-do="prev" title="Back (←)">◀</button>' +
            '<button type="button" data-do="auto" title="Play the steps">▶▶</button>' +
            '<button type="button" data-do="next" title="Next (→)">▶</button>' +
            '<button type="button" data-do="next-ex" title="The next exercise (in the list shown)">⏭</button></div>' +
            '<div class="pro-viewer-buttons"><button type="button" class="install-button" data-do="play">Play this exercise</button>' +
            '<button type="button" class="install-button" data-do="from" title="Play in order from this exercise: the game goes on to the next ones">Play from here</button>' +
            '<button type="button" class="install-button" data-do="like" title="All the exercises whose first spin is the same kind, shuffled">More like this</button>' +
            '<button type="button" class="install-button" data-do="fav" title="Keep it in your favourites (Results filter)">☆ Favourite</button>' +
            '<button type="button" class="install-button" data-do="close">Close</button>' +
            '<button type="button" class="install-button danger" data-do="remove" title="Remove this exercise from your list">Remove</button></div></div>'
        document.body.appendChild(viewer)
        viewer.addEventListener('click', ev => {
            if (ev.target == viewer) return close_viewer()
            var what = ev.target.dataset && ev.target.dataset.do
            if (what == 'prev') viewer.go(-1)
            if (what == 'next') viewer.go(1)
            if (what == 'auto') viewer.auto()
            if (what == 'play') play([viewer.exercise])
            if (what == 'from') play_from(viewer.exercise)
            if (what == 'like'){
                var kind = one_label(spins_of(viewer.exercise)[0])
                var list = load_library().exercises.filter(x => one_label(spins_of(x)[0]) == kind)
                for (var i=list.length-1; i>0; i--){ var j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]] }
                play(list)
            }
            if (what == 'close') close_viewer()
            if (what == 'fav'){
                var favs = load_favs(), id = exercise_id(viewer.exercise)
                if (favs.has(id)) favs.delete(id)
                else favs.add(id)
                save_favs(favs)
                fav_label()
                show_library()
            }
            if (what == 'prev-ex' || what == 'next-ex'){
                // the list as shown on the page
                var list = sorted(filtered(load_library())), id = exercise_id(viewer.exercise)
                var i = list.findIndex(x => exercise_id(x) == id)
                if (list.length){
                    viewer.stop()
                    watch(list[(i + (what == 'next-ex'? 1: -1) + list.length) % list.length])
                }
            }
            if (what == 'remove' && confirm('Remove this exercise?')){
                var lib = load_library(), id = exercise_id(viewer.exercise)
                lib.exercises = lib.exercises.filter(x => exercise_id(x) != id)
                save_library(lib)
                close_viewer()
                show_library()
            }
        })
        // on a phone: swipe the board left or right to step
        var canvas = viewer.querySelector('canvas'), swipe = null
        canvas.addEventListener('touchstart', ev => { swipe = ev.touches[0].clientX }, {passive: true})
        canvas.addEventListener('touchend', ev => {
            if (swipe === null) return
            var dx = ev.changedTouches[0].clientX - swipe
            swipe = null
            if (Math.abs(dx) > 30) viewer.go(dx < 0? 1: -1)
        })
        document.addEventListener('keydown', ev => {
            if (!viewer || viewer.hidden) return
            if (ev.key == 'ArrowLeft') viewer.go(-1)
            else if (ev.key == 'ArrowRight') viewer.go(1)
            else if (ev.key == 'Escape') close_viewer()
            else if (ev.key == ' ') viewer.auto()
            else return
            ev.preventDefault()
        })
    }
    var at = 0, timer = null
    viewer.exercise = e
    viewer.querySelector('.pro-viewer-title').textContent = spin_label(e) + ' · ' + e.source.username + ', round ' + (e.source.round + 1) +
        (e.source.seconds? ' · ' + e.source.seconds + ' s': '')
    fav_label()
    // the queue: placed pieces dimmed, the last one placed outlined, spin pieces marked
    var spin_at = new Set(), k = -1
    spins_of(e).forEach(s => { k += s.build.length + 1; spin_at.add(k) })
    var strip = viewer.querySelector('.pro-queue')
    strip.textContent = ''
    var chips = e.queue.map((piece, i) => {
        var chip = document.createElement('span')
        chip.className = 'pro-chip' + (spin_at.has(i)? ' spin': '')
        chip.style.background = color_table[piece]
        chip.textContent = piece
        chip.title = spin_at.has(i)? 'Spin piece': 'Setup piece'
        strip.appendChild(chip)
        return chip
    })
    var show = () => {
        draw_step(viewer.querySelector('canvas'), steps[at], rows)
        chips.forEach((chip, i) => {
            chip.classList.toggle('done', i < steps[at].placed - 1 || (i == steps[at].placed - 1 && !steps[at].outline))
            chip.classList.toggle('now', i == steps[at].placed - 1 && !!steps[at].outline)
            chip.classList.toggle('next', i == steps[at].placed && !steps[at].outline)
        })
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
function fav_label(){
    var button = viewer && viewer.querySelector('[data-do="fav"]')
    if (button) button.textContent = load_favs().has(exercise_id(viewer.exercise))? '★ Favourite': '☆ Favourite'
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
// the ones missed and not solved since (the last try was a miss: more misses than
// solves), whatever the filters
function misses(lib){
    var results = load_results()
    return lib.exercises.filter(e => { var [solved, tries] = results[exercise_id(e)] || [0, 0]; return tries > 0 && tries - solved > solved })
}
// Quick 10: missed ones first, then not tried, then solved ones (the slowest first),
// shuffled within each group, from the exercises shown
document.getElementById('play-quick').onclick = () => {
    var results = load_results(), list = filtered(load_library())
    var rank = e => {
        var [solved, tries, best] = results[exercise_id(e)] || [0, 0]
        return tries - solved > solved? 0: !tries? 1: 2 + 1 / (best || 1)
    }
    list = list.map(e => ({e: e, r: rank(e) + Math.random() * 0.5})).sort((a, b) => a.r - b.r).slice(0, 10).map(x => x.e)
    if (list.length) play(list)
}
document.getElementById('play-misses').onclick = () => {
    var list = in_order(misses(load_library()))
    if (list.length) play(list)
}
// the order chosen: the games' (the order they were added), easiest or hardest first
function sorted(list){
    var order = document.getElementById('sort').value
    if (!order) return list
    var sign = order == 'easy'? 1: -1
    return [...list].sort((a, b) => sign * (difficulty(a) - difficulty(b) || a.queue.length - b.queue.length))
}
// Play these: shuffled, or in the order chosen
document.getElementById('play-all').onclick = () => {
    var list = filtered(load_library())
    if (document.getElementById('sort').value) list = sorted(list)
    else for (var i=list.length-1; i>0; i--){ var j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]] }
    if (list.length) play(list)
}
function play_all_label(){
    var order = document.getElementById('sort').value
    document.getElementById('play-all').textContent = 'Play these (' + (order == 'easy'? 'easiest first': order == 'hard'? 'hardest first': 'shuffled') + ')'
}

/*
Export / import of the replay exercises (with their rounds and your results), to
move them to another device
*/
document.getElementById('export').onclick = () => {
    var data = {kind: 'tetris-practice-allspin-replays', version: 1, library: load_library(), results: load_results()}
    var blob = new Blob([JSON.stringify(data)], {type: 'application/json'})
    var a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'allspin-replay-exercises.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
document.getElementById('import').onchange = async e => {
    var file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try{
        var data = JSON.parse(await file.text())
        if (data.kind != 'tetris-practice-allspin-replays') throw new Error('not an export')
        var lib = load_library(), have = new Set(lib.exercises.map(exercise_id)), added = 0
        for (var x of data.library.exercises || []) if (!have.has(exercise_id(x))){ lib.exercises.push(x); have.add(exercise_id(x)); added++ }
        for (var s of data.library.sources || []) if (!lib.sources.some(t => t.file == s.file)) lib.sources.push(s)
        Object.assign(lib.timelines, data.library.timelines || {})
        save_library(lib)
        // results: keep the larger counts
        var results = load_results()
        for (var [id, r] of Object.entries(data.results || {})){
            var mine = results[id] || [0, 0]
            results[id] = r[1] > mine[1]? r: mine
        }
        try{ localStorage.setItem('allspin_pro_results', JSON.stringify(results)) }catch(err){}
        status(added + ' exercises imported.')
        show_library()
    }
    catch(err){ status('That file is not an export of replay exercises.') }
}
document.getElementById('sort').onchange = () => { play_all_label(); show_library() }
for (var id of ['filter-level', 'filter-results', 'filter-round', 'filter-player', 'filter-piece', 'filter-lines', 'filter-count', 'filter-size'])
    document.getElementById(id).onchange = show_library

show_library()
