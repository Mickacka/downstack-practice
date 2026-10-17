// The Shapes page (allspin-shapes.html): the real spin shapes of allspin-shapes.js,
// drawn, with how often players used them, your results on each (from shape drills
// on the All-Spin page) and the replay exercises where a player used it.

// The facts behind the shapes (from the same three games: see ALLSPIN.md 3.11)
const SHAPE_FACTS = [['T spins', '59%'], ['Singles', '41%'], ['Upright slots (S/Z/L/J)', '17%'],
    ['Roofed by the board already', '37%'], ['Right after another spin', '47%'], ['2+ columns from the walls', '78%']]

function load_json(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key)) || fallback }
    catch(err){ return fallback }
}

// A shape as a little picture: the slot in its piece's colour, the cells that must be
// filled, the open ones, a roof higher up (dashed), and ↑ over a column open to the top
function draw_shape(canvas, s){
    var cells = s.c.concat(s.f, s.e)
    var top = Math.max(...s.c.map(c => c[1]))
    var x0 = Math.min(...cells.map(c => c[0])), x1 = Math.max(...cells.map(c => c[0]))
    var y0 = Math.min(...cells.map(c => c[1])), y1 = Math.max(top + 2, ...cells.map(c => c[1]))
    var size = 15, w = x1 - x0 + 1, h = y1 - y0 + 1, dpr = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = w * size * dpr
    canvas.height = h * size * dpr
    canvas.style.width = w * size + 'px'
    canvas.style.height = h * size + 'px'
    var ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    var px = x => (x - x0) * size, py = y => (y1 - y) * size
    var key = (x, y) => x + ',' + y
    var has = list => new Set(list.map(([x, y]) => key(x, y)))
    var fill = has(s.f), open = has(s.e), slot = has(s.c)
    for (var y=y0; y<=y1; y++)
        for (var x=x0; x<=x1; x++){
            var k = key(x, y)
            if (slot.has(k)){ ctx.fillStyle = color_table[s.p]; ctx.fillRect(px(x), py(y), size - 1, size - 1) }
            else if (fill.has(k)){ ctx.fillStyle = '#8a8d93'; ctx.fillRect(px(x), py(y), size - 1, size - 1) }
            else if (open.has(k)){
                ctx.fillStyle = '#000'; ctx.fillRect(px(x), py(y), size - 1, size - 1)
                ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(px(x) + size / 2, py(y) + size / 2, 1.6, 0, 7); ctx.fill()
            }
        }
    // roofs and open columns
    var cols = [...new Set(s.c.map(c => c[0]))].sort((a, b) => a - b)
    cols.forEach((x, i) => {
        var high = Math.max(...s.c.filter(c => c[0] == x).map(c => c[1]))
        if (s.s[i] == 'r'){
            if (fill.has(key(x, high + 1))) return
            ctx.setLineDash([3, 2])
            ctx.strokeStyle = '#8a8d93'
            ctx.lineWidth = 1.5
            ctx.strokeRect(px(x) + 1.5, py(high + 2) + 1.5, size - 4, size - 4)
            ctx.setLineDash([])
        }
        else{
            ctx.fillStyle = '#ddd'
            ctx.font = 'bold 11px sans-serif'
            ctx.textAlign = 'center'
            var y = high + 1
            while (fill.has(key(x, y)) || open.has(key(x, y))) y++
            ctx.fillText('↑', px(x) + size / 2, py(Math.min(y, y1)) + size - 3)
        }
    })
}

// The signature of a spin in a replay exercise, as in the table: the slot (S and L for
// Z and J, mirrored), the cells touching it and the roofed columns. Index in
// SPIN_SHAPES, or -1.
function shape_of_spin(board, spin){
    var flip = spin.piece == 'Z' || spin.piece == 'J'
    var b = flip? board.map(row => [...row].reverse()): board
    var cells = spin.cells.map(([c, r]) => [flip? 9 - c: c, r])
    var slot = new Set(cells.map(([c, r]) => c + ',' + r))
    var x0 = Math.min(...cells.map(c => c[0])), y0 = Math.min(...cells.map(c => c[1]))
    var filled = (c, r) => c < 0 || c > 9 || r < 0 || (r < 20 && b[r][c] != 'N')
    var fill = [], empty = [], seen = new Set()
    for (var [c, r] of cells) for (var [dc, dr] of [[-1, 0], [1, 0], [0, 1], [0, -1]]){
        var k = (c + dc) + ',' + (r + dr)
        if (slot.has(k) || seen.has(k)) continue
        seen.add(k)
        ;(filled(c + dc, r + dr)? fill: empty).push([c + dc - x0, r + dr - y0])
    }
    var cols = [...new Set(cells.map(c => c[0]))].sort((a, b) => a - b)
    var sky = cols.map(c => {
        var high = Math.max(...cells.filter(x => x[0] == c).map(x => x[1]))
        for (var r=high+1; r<20; r++) if (filled(c, r)) return 'r'
        return '^'
    }).join('')
    var piece = ({Z: 'S', J: 'L'})[spin.piece] || spin.piece
    var sig = shape_key({p: piece, l: spin.lines, c: cells.map(([c, r]) => [c - x0, r - y0]), f: fill, e: empty, s: sky})
    return SHAPE_INDEX.has(sig)? SHAPE_INDEX.get(sig): -1
}
function shape_key(s){
    var list = l => l.map(c => c.join(',')).sort().join(' ')
    return [s.p, s.l, list(s.c), list(s.f), list(s.e), s.s].join('|')
}
const SHAPE_INDEX = new Map()
SPIN_SHAPES.forEach((s, i) => { if (!SHAPE_INDEX.has(shape_key(s))) SHAPE_INDEX.set(shape_key(s), i) })

// your replay exercises by shape: {index: [exercise ids]} (an exercise counts for each
// of its spins' shapes)
function examples(){
    var lib = load_json('allspin_pro', {exercises: []}), out = {}
    for (var e of lib.exercises || []){
        var id = [e.source.file, e.source.round, e.source.username, e.source.placement, (e.spins || [1]).length].join(':')
        var b = e.board.map(row => [...row])
        for (var spin of e.spins || []){
            for (var p of [...spin.build].reverse()) for (var [c, r] of p.cells) if (r < 20) b[r][c] = p.piece
            var i = shape_of_spin(b, spin)
            if (i >= 0) (out[i] = out[i] || new Set()).add(id)
            for (var [c, r] of spin.cells) if (r < 20) b[r][c] = spin.piece
            var rows = b.filter(row => row.some(x => x == 'N'))
            while (rows.length < 20) rows.push(Array(10).fill('N'))
            b = rows
        }
    }
    return out
}

function show(){
    var piece = document.getElementById('filter-piece').value
    var lines = document.getElementById('filter-lines').value
    var order = document.getElementById('sort').value
    var stats = load_json('allspin_shape_stats', {}), found = examples()
    // each shape's share of its kind of spin (piece and lines)
    var kind_total = {}
    SPIN_SHAPES.forEach(s => kind_total[s.p + s.l] = (kind_total[s.p + s.l] || 0) + s.n)
    var list = SPIN_SHAPES.map((s, i) => ({s: s, i: i})).filter(({s}) => (!piece || s.p == piece) && (!lines || s.l == lines))
    var miss = i => { var [done, tries] = stats[i] || [0, 0]; return tries? (tries - done) / tries: -1 }
    if (order == 'weak') list.sort((a, b) => miss(b.i) - miss(a.i) || b.s.n - a.s.n)
    else if (order == 'new') list.sort((a, b) => ((stats[a.i] || [0, 0])[1] > 0) - ((stats[b.i] || [0, 0])[1] > 0) || b.s.n - a.s.n)
    else list.sort((a, b) => b.s.n - a.s.n)
    document.getElementById('shown').textContent = list.length + ' shapes'
    var grid = document.getElementById('grid')
    grid.textContent = ''
    for (var {s, i} of list){
        var card = document.createElement('div')
        card.className = 'pro-card shape-card'
        var canvas = document.createElement('canvas')
        draw_shape(canvas, s)
        var name = shape_name(s)
        var title = document.createElement('span')
        title.className = 'pro-label'
        title.textContent = name.title
        var text = document.createElement('span')
        text.className = 'pro-who'
        text.textContent = name.text
        var share = document.createElement('span')
        share.className = 'pro-who'
        share.textContent = Math.round(100 * s.n / kind_total[s.p + s.l]) + '% of ' + name.title.replace('-Spin', '-spin') + 's · ' + s.n + ' in the games'
        card.append(canvas, title, text, share)
        var [done, tries] = stats[i] || [0, 0]
        if (tries){
            var mine = document.createElement('span')
            mine.className = 'pro-result ' + (done * 2 >= tries? 'won': 'lost')
            mine.textContent = 'You: ' + done + '/' + tries
            card.appendChild(mine)
        }
        var buttons = document.createElement('div')
        buttons.className = 'shape-buttons'
        var practise = document.createElement('a')
        practise.className = 'install-button'
        practise.href = 'allspin-practice.html#shape=' + i
        practise.textContent = 'Practise'
        practise.title = 'Maps built only around this shape, until you stop'
        if (!s.watch_only) buttons.appendChild(practise)
        else{
            var note = document.createElement('span')
            note.className = 'pro-who'
            note.textContent = "Watch only: this trainer can't build it (it likely needs TETR.IO's own kicks)"
            card.appendChild(note)
        }
        var ids = found[i]
        if (ids && ids.size){
            var watch = document.createElement('button')
            watch.type = 'button'
            watch.className = 'install-button'
            watch.textContent = 'Examples (' + ids.size + ')'
            watch.title = 'Your replay exercises where a player used this shape'
            watch.onclick = (list => () => {
                try{ sessionStorage.setItem('allspin_pro_play', JSON.stringify(list)) }catch(err){}
                location.href = 'allspin-practice.html#pro'
            })([...ids])
            buttons.appendChild(watch)
        }
        card.appendChild(buttons)
        grid.appendChild(card)
    }
}

var facts = document.getElementById('facts')
for (var [label, value] of SHAPE_FACTS){
    var card = document.createElement('div')
    card.className = 'stat-card'
    card.innerHTML = '<span class="stat-label"></span><strong class="stat-value"></strong>'
    card.querySelector('.stat-label').textContent = label
    card.querySelector('.stat-value').textContent = value
    facts.appendChild(card)
}
for (var id of ['filter-piece', 'filter-lines', 'sort']) document.getElementById(id).onchange = show
show()
