// Quick Play (TETR.IO's "zenith" mode, and Expert Quick Play): the garbage, the
// altitude and the bag, as the game does them. Written for this site from how the game
// works (the rules were read from TETR.IO's client to understand them; no code of
// theirs is used). Replays have the player's inputs and the attacks sent to them, not
// where garbage went: with these rules and the game's own second random generator
// (seeded from the replay), the rebuilt game is the real one.
// The tetrp engine moves and locks the pieces; attack, cancelling, garbage, altitude
// and the zenith bag are here.
import { Engine } from './vendor/tetrp/engine.js'
import { seedState, random } from './vendor/tetrp/random.js'

const FLOOR_AT = [0, 50, 150, 300, 450, 650, 850, 1100, 1350, 1650, Infinity]
const BUMP_CAP = [4, 4, 5, 6, 7, 8, 9, 10, Infinity, Infinity, Infinity]
const GRACE_REV_EX = [0, 1, .9, .8, .7, .6, .5, .4, .3, .2, .1]
const floor_of = alt => FLOOR_AT.filter(d => alt >= d).length || 1
const speed_cap = alt => Math.max(0, Math.min(1, (FLOOR_AT.find(d => alt < d) - alt) / 5 - .2))
// attack per clear: [none, mini, full] x lines
const ATTACK = { none: [0, 0, 1, 2, 4, 5], mini: [0, 0, 1, 2, 4, 5], full: [0, 2, 4, 6, 10, 12] }
// timed events that change play (frame: [[what, value]]), by mod
const FATIGUE = {
    normal: [[28800, [['unclearable']]], [28830, [['unclearable']]], [32400, [['receivemultiplier', .25]]],
        [36000, [['unclearable']]], [36030, [['unclearable']]], [36060, [['unclearable']]], [39600, [['receivemultiplier', .25]]],
        [43200, [['unclearable']]], [43230, [['unclearable']]], [43260, [['unclearable']]], [43310, [['unclearable']]], [43360, [['unclearable']]]],
    expert_reversed: [[21600, [['gracestillmessy']]], [25200, [['receivemultiplier', .25]]], [28800, [['unclearable']]], [28830, [['unclearable']]],
        [28860, [['unclearable']]], [32400, [['receivemultiplier', .25]]], [36000, [['unclearable']]], [36030, [['unclearable']]],
        [36060, [['unclearable']]], [36110, [['unclearable']]], [36160, [['unclearable']]], [39600, [['maxmessy']]]],
}

export class Zenith {
    constructor(data){
        const r = data.replay, o = r.options
        this.o = o
        this.expert = !!o.zenith_expert
        this.mod = (o.zenith_mods || [])[0] || null
        this.continuous = o.garbageentry == 'continuous'
        this.events = r.events.filter(e => e.type == 'keydown' || e.type == 'keyup')
            .map(e => ({frame: e.frame, type: e.type, key: e.data.key, subframe: e.data.subframe}))
        this.ige = r.events.filter(e => e.type == 'ige').map(e => ({frame: e.frame, d: e.data}))
        this.frames = r.frames
        this.gameid = o.gameid
        this.grace_table = o.TEMP_zenith_grace ? JSON.parse(o.TEMP_zenith_grace) : [0, 4.8, 3.9, 2.1, 1.4, 1.3, .9, .6, .4, .3, .2]
        this.fatigue = FATIGUE[this.mod == 'expert_reversed' ? 'expert_reversed' : 'normal']
        const e = this.e = new Engine({mode: 'tl', seed: o.seed, handling: o.handling,
            rules: {g: o.g ?? 0.02, gincrease: o.gincrease ?? 0, gmargin_frames: 0}})
        // the zenith bag (extras by cancel streak), refilled under 6 pieces
        this.bag = {rng: seedState(o.seed), queue: [], seen_i5: false}
        e.state.bag = this.bag
        this.z = {altitude: 0, rank: 1, floor: 0, climb: 0, locked_until: -1, promote: false, fatigue: 0, bonus: 0,
            grace: 0, lastatk: 0, streak: 0, stale: 0, lasttank: 0, lastcol: null, changed: false,
            imp: [], hes: [], waits: [], are: [], are_until: 0, windup: 0, gid: 0, pieces: 0, sent: 0, combo: 0, btb: 0,
            sick_i: [], sick_sz: [], sick_lj: [], szsick: [], lastfloorchange: 0, maxrank: 99999,
            recv: 1, change: 0, inner: 0, center: false, favor: 0, phase: 1, gracestillmessy: false, maxmessy: false,
            rngex: seedState(o.seed), draws: 0}
        this.cursor = 0; this.igecursor = 0; this.n = 0; this.log = []
        this.patch()
        e.spawn()
        e.trace = []
    }
    rnd(){ this.z.draws++; return random(this.z.rngex) }
    // the engine pulls pieces from our bag; locks go through our rules
    patch(){
        const self = this, e = this.e
        const pull = () => {
            const b = self.bag
            while (b.queue.length < 6) self.populate()
            return b.queue.shift()
        }
        // every new piece comes from the zenith bag (also the first hold, from an empty hold)
        const orig_spawn = Engine.prototype.spawn
        e.spawn = function(explicit = null, fromARE = false, fromHold = false){
            if (explicit == null){ explicit = pull(); if (explicit == 'i5'){ self.stopped = 'a 5-block I (not supported)'; explicit = 'i' } }
            return orig_spawn.call(this, explicit, fromARE, fromHold)
        }
        const orig_lock = Engine.prototype.lock
        e.lock = function(){
            const s = this.state, p = s.piece
            if (!s.playing || p.sleeping) return
            const piece = {type: p.type, x: p.x, y: p.y, r: p.r, spin: p.spin}
            const before = s.board.rows.map(row => [...row])
            const t0 = this.trace.length
            orig_lock.call(this)
            const rm = this.trace.slice(t0).find(t => t.type == 'remove-lines')
            const lk = this.trace.slice(t0).find(t => t.type == 'lock')
            self.last_cells = lk ? lk.cells : []
            const rows = rm ? rm.rows : []
            self.on_lock(piece, rows, before, rm && rm.allClear)
        }
    }
    populate(){
        const b = this.bag, rng = () => random(b.rng)
        const shuffle = a => { for (let n = a.length - 1; n > 0; n--){ const t = Math.floor(rng() * (n + 1)); [a[n], a[t]] = [a[t], a[n]] } return a }
        const base = shuffle([...'zlosijt']), x = [], c = this.z.streak, a = this.o.zenith_volatile ? 2 : 1
        if (c >= 20 * a) x.push('o')
        if (c >= 30 * a) x.push(rng() < .5 ? 'l' : 'j')
        if (c >= 40 * a) x.push(rng() < .5 ? 's' : 'z')
        if (c >= 50 * a) x.push(rng() < .5 ? 'l' : 'j')
        if (c >= 50 * a) x.push(rng() < .5 ? 't' : 'i')
        if (c >= 60 * a) x.push(rng() < .5 ? 's' : 'z')
        if (x.length) shuffle(x)
        const out = [...base, ...x]
        if (c >= 40 && !b.seen_i5){ b.seen_i5 = true; out.unshift('i5'); this.log.push('i5 at piece ' + this.n) }
        b.queue.push(...out)
    }
    // ---- the frame loop ----
    // one placement: returns the lock info, or null at the end
    step(){
        const e = this.e
        while (true){
            const s = e.state
            if (!s.playing || s.frame >= this.frames || this.stopped) return null
            if (s.phase === 'ready'){
                this.cur = s.frame + 1
                this.pull_ige(s.frame)
                e.beginFrame([])
            }
            const ev = this.events[this.cursor]
            this.locked = null
            if (ev && ev.frame === s.frame){ e.input(ev); this.cursor++ }
            else { e.finishFrame(); this.end_frame() }
            e.trace.length = 0
            if (this.locked){ const l = this.locked; this.locked = null; return l }
        }
    }
    pull_ige(frame){
        while (this.igecursor < this.ige.length && this.ige[this.igecursor].frame <= frame){
            const { d } = this.ige[this.igecursor++]
            if (d.type == 'interaction' && d.data && d.data.type == 'garbage') this.add_pending(d.data, frame)
            if (d.type == 'kev' && d.data && d.data.killer && d.data.killer.gameid === this.gameid) this.award_kill()
        }
    }
    end_frame(){
        const z = this.z, f = this.cur
        // timed waits
        for (let i = 0; i < z.waits.length;){
            const w = z.waits[i]
            if (w.at > f){ i++; continue }
            z.waits.splice(i, 1)
            this.run_wait(w)
        }
        if (this.continuous) this.garbage_are()
        this.hesitated()
        this.update()
    }
    wait(n, what, data){ this.z.waits.push({at: this.cur + n, what, data}) }
    run_wait(w){
        const z = this.z
        if (w.what == 'hit'){ const p = z.imp.find(p => p.id == w.data); if (p){ p.active = true; this.status(p) } }
        else if (w.what == 'status'){ const p = z.imp.find(p => p.id == w.data); if (p) this.status(p) }
        else if (w.what == 'explode-start') this.explode_start(w.data)
        else if (w.what == 'exploded'){ z.imp.push(w.data); this.incoming(w.data) }
    }
    status(p){
        if (p.status == 'sleeping'){ p.status = 'caution'; this.wait(p.delay, 'status', p.id) }
        else if (p.status == 'caution'){ if (p.firstcycle) p.status = 'danger'; this.wait(p.delay, 'status', p.id) }
        else if (p.status == 'danger') p.status = 'spawn'
        p.firstcycle = true
    }
    // ---- incoming ----
    add_pending(d, frame){
        const z = this.z
        let i = d.amt, delay = z.phase
        const s = z.altitude, a = Math.max(Math.min(3500, d.zthalt ?? 0), Math.min(2000, s - 1000))
        if (a < s) i *= 1 + .004 * (s - a) ** 2 / (s + a)
        let l = .001
        if (this.o.zenith_volatile && !this.o.zenith_allspin) l = 3e-4
        if (!this.o.zenith_volatile && this.o.zenith_allspin) l = .002
        const c = i + l * z.streak ** 2
        let cap = BUMP_CAP[z.floor] ?? Infinity
        if (z.windup >= frame) cap = Math.min(6, cap)
        if (this.o.zenith_volatile) cap *= 2
        i = Math.max(i, Math.min(c, cap))
        if (z.streak >= 25 && !this.o.zenith_volatile) delay = Math.floor(delay / 2)
        if (z.grace > 8) i *= 1 - .05 * (z.grace - 8)
        i = this.round(i * z.recv)
        if (i <= 0){ if (i){ z.lastatk = this.cur; this.attacked(i) } return }
        z.hes.push({id: ++z.gid, sender: d.gameid ?? null, amt: i, delay, status: delay >= 1 ? 'caution' : 'spawn', active: true, firstcycle: false})
    }
    round(x){ const n = Math.floor(x); if (n === x) return x; return n + (this.rnd() < x - n ? 1 : 0) }
    attacked(amt){ const z = this.z, t = Math.min(18 - z.grace, amt); if (t > 0) z.grace += t }
    hesitated(){
        const z = this.z
        if (!z.hes.length) return
        const by = new Map()
        for (const p of z.hes){
            if (p.sender == null){ this.queue_attack(p); continue }
            if (!by.has(p.sender)) by.set(p.sender, [])
            by.get(p.sender).push(p)
        }
        for (const [, list] of by){ const p = {...list[0], amt: 0}; for (const q of list) p.amt += q.amt; this.queue_attack(p) }
        z.hes.length = 0
    }
    queue_attack(p){
        const z = this.z
        if (p.amt >= (this.o.zenith_volatile ? 16 : 8)) return this.explode(p)
        z.imp.push(p)
        this.incoming(p)
    }
    incoming(p){
        const z = this.z
        z.lastatk = this.cur
        this.attacked(this.mod == 'volatile_reversed' ? Math.floor(p.amt / 3) : p.amt)
        p.active = false
        this.wait(20, 'hit', p.id)
    }
    explode(p){
        const z = this.z
        let s = p.amt, o = 16
        z.gid--
        if (z.altitude >= 4000) o += Math.floor((z.altitude - 3500) / 500)
        if (this.o.zenith_volatile) o *= 2
        const a = Math.floor(o / 4), r = o - 4 * a, l = [a, a, a, a]
        for (let k = 0; k < r; k++) l[3 - k]++
        const chunks = []
        let c = 0
        while (chunks.length < l.length && s){ const m = Math.min(l[c++], s); s -= m; chunks.push({...p, amt: m, id: ++z.gid}) }
        const len = 120 + 30 * chunks.length
        if (z.windup > this.cur){ this.wait(z.windup - this.cur, 'explode-start', chunks); z.windup += len }
        else { this.explode_start(chunks); z.windup = this.cur + len }
    }
    explode_start(chunks){ chunks.forEach((c, n) => this.wait(60 + 30 * n, 'exploded', c)) }
    // ---- the column of the next garbage ----
    reroll(){
        const z = this.z, rows = this.e.state.board.rows, T = rows.length, W = 10
        if (z.favor !== 0){
            let s = -1
            for (let y = T - 1; y >= 0; y--){
                let hole = -1, gb = false
                for (let x = 0; x < W; x++){ if (hole === -1 && rows[y][x] === null) hole = x; if (rows[y][x] === 'gb') gb = true }
                if (hole !== -1){ if (gb) s = hole; break }
            }
            const cols = []
            outer: for (let x = 0; x < W; x++){
                for (let y = 0; y < T; y++) if (rows[y][x] !== null){ const h = T - y, d = s === -1 ? 0 : Math.abs(x - s); cols.push([x, h + 5 * d + .1 * this.rnd()]); continue outer }
                cols.push([x, .1 * this.rnd()])
            }
            cols.sort((a, b) => a[1] - b[1])
            let total = 0
            for (let k = 0; k < cols.length; k++){
                let w = Math.max(0, 10 + z.favor + k * ((20 - 2 * (10 + z.favor)) / 9))
                if (this.o.messiness_nosame && z.lastcol === cols[k][0]) w = 0
                if (z.center){ const m = Math.round(W / 5); if (cols[k][0] < m || cols[k][0] >= W - m) w = 0 }
                cols[k][2] = total + w; total += w
            }
            const pick = this.rnd() * total
            for (const c of cols) if (c[2] !== 0 && pick <= c[2]) return z.lastcol = c[0]
            return 0
        }
        const m = z.center ? Math.round(W / 5) : 0
        let n
        if (this.o.messiness_nosame && z.lastcol !== null){ n = m + Math.floor(this.rnd() * (W - 1 - 2 * m)); if (n >= z.lastcol) n++ }
        else n = m + Math.floor(this.rnd() * (W - 2 * m))
        return z.lastcol = n
    }
    push_line(col){
        const ok = this.e.insertGarbage(col)
        this.since = (this.since || 0) + 1
        return ok
    }
    // ---- your attack ----
    fight(n){
        const z = this.z
        let extra = 0
        if (z.pieces <= (this.o.openerphase ?? 0) && this.pending() >= z.sent) extra += n
        let p = 0
        while ((n > 0 || extra > 0) && z.are.length){ z.are.shift(); n ? n-- : extra--; p++ }
        let k = 0
        while (n > 0 || extra > 0){
            const q = z.imp[k]
            if (!q) break
            q.amt--
            if (!q.amt){ z.imp.splice(k, 1); if (this.rnd() < z.change){ this.reroll(); z.changed = true } }
            n ? n-- : extra--
            p++
        }
        if (p){
            this.award_lines(p * (this.expert || this.mod == 'volatile_reversed' || this.mod == 'duo_reversed' ? 0 : 1), false)
            z.streak += p
        }
        if (n > 0){ this.award_lines(n, true); z.sent += n }
        return p
    }
    pending(){ return this.z.imp.reduce((a, p) => a + p.amt, 0) }
    take_all(){
        const z = this.z
        const cap = Math.floor(Math.min(this.o.garbagecapmax ?? 8, this.o.garbagecap ?? 8))
        let h = z.change, d = z.inner
        if (!this.o.zenith_messy && !z.gracestillmessy && this.mod != 'duo_reversed'){ h = Math.max(0, h - .0375 * z.grace); d = Math.max(0, d - .015 * z.grace) }
        const later = []
        for (let k = z.imp.length - 1; k >= 0; k--){ const q = z.imp[k]; if (!(q.active && q.status == 'spawn')){ later.unshift(q); z.imp.splice(k, 1) } }
        let tanked = false, pushed = 0
        for (let k = 0; k < cap && z.imp.length; k++){
            const s = z.imp[0]
            s.amt--
            let col = z.lastcol
            if (col === null || this.rnd() < d){ if (!z.changed){ col = this.reroll(); z.changed = true } }
            tanked = true
            if (this.continuous){ z.are.push(col); z.are_until = Math.max(z.are_until, this.cur + (this.o.garbageare ?? 5)) }
            else { pushed++; this.push_line(col) }
            z.changed = false
            if (!s.amt){ z.imp.shift(); if (this.rnd() < h){ this.reroll(); z.changed = true } }
        }
        z.imp.push(...later)
        if (tanked){ z.streak = Math.max(0, z.streak - 3 * pushed); z.lasttank = this.cur; z.stale = this.cur }
    }
    garbage_are(){
        const z = this.z, s = this.e.state
        if (s.piece.sleeping || !z.are.length || this.cur < z.are_until) return
        const col = z.are.shift()
        this.push_line(col)
        z.streak = Math.max(0, z.streak - 3); z.lasttank = this.cur; z.stale = this.cur
        z.are_until = this.cur + (this.o.garbageare ?? 5)
    }
    // ---- a lock ----
    on_lock(piece, rows, before, allclear){
        const z = this.z, o = this.o
        z.pieces++
        // garbage that came in since the last placement (before this one)
        const gb = this.since || 0
        this.since = 0
        const lines = rows.length
        const garbage = rows.filter(y => before[y].includes('gb')).length
        if (garbage){ z.lasttank = this.cur; z.streak = 0; z.stale = this.cur }
        const full = piece.spin != 'none', mini = piece.spin == 'mini'
        const spin = full   // (all-mini+: every spin is a spin, minis are marked)
        let a = 0
        if (allclear) a += o.allclear_b2b ?? 0
        if (lines){
            z.combo++
            if (lines >= 4) a++
            else if (spin) a++
            if (!this.expert) this.award_lines(Math.min(2, lines), false)
            if (allclear && !o.allclear_b2b_dupes) a = Math.max(o.allclear_b2b ?? 0, a - (o.allclear_b2b ?? 0))
        }
        else z.combo = 0
        if (a > 0) z.btb += a
        else if (lines){
            const at = o.b2bcharge_at ?? 4, base = o.b2bcharge_base ?? 0
            if ((o.b2bcharging) && z.btb > at){
                const n = Math.floor((z.btb - at + base) * 1)
                for (const k of [Math.round(n / 3), Math.round(n / 3), n - 2 * Math.round(n / 3)]) if (k) this.fight(k)
            }
            z.btb = 0
        }
        // cancel streak details
        if (spin && piece.type == 'i' && lines){ z.streak = Math.max(0, z.streak - 2); z.stale = this.cur }
        if (lines && spin){
            const list = ['s', 'z'].includes(piece.type) ? z.sick_sz : ['l', 'j'].includes(piece.type) ? z.sick_lj : null
            if (list){ const k = list.indexOf(piece.x); if (k !== -1) list.splice(k, 1); list.push(piece.x)
                if (list.length > 2){ list.shift(); z.streak = Math.max(0, z.streak - 2); z.stale = this.cur } }
        }
        if (!lines && piece.type == 'i' && piece.r % 2 == 1){
            const n = piece.x + (piece.r == 1 ? 1 : 0), nb = n == 0 ? 1 : n == 1 ? 0 : n == 8 ? 9 : n == 9 ? 8 : -1
            if (nb !== -1){
                // the 4 cells beside the I, in the wall column next to it
                const b = this.e.state.board.rows, cells = this.last_cells || []
                let count = 0
                for (const [, y] of cells) if (b[y] && b[y][nb] === 'i') count++
                if (count === 4) z.streak += 3
            }
        }
        if (lines && spin && (piece.type == 's' || piece.type == 'z')){
            const same = z.szsick.filter(t => t == piece.type).length
            if (same >= 5) z.streak += 2
            z.szsick.push(piece.type); if (z.szsick.length > 6) z.szsick.shift()
        }
        let d = 0
        if (lines >= 4 && !spin){
            z.streak = Math.max(0, z.streak - 3); z.stale = this.cur
            const n = piece.x + (piece.r == 1 ? 1 : 0), k = z.sick_i.indexOf(n)
            if (k !== -1) z.sick_i.splice(k, 1); z.sick_i.push(n)
            if (z.sick_i.length > 2){ z.sick_i.shift(); z.streak = Math.max(0, z.streak - 4); z.stale = this.cur }
        }
        d = ATTACK[mini ? 'mini' : full ? 'full' : 'none'][Math.min(lines, 5)] ?? 0
        if (lines == 1 && !spin && !this.expert && !(this.mod && this.mod.includes('_reversed')) && z.combo == 1) d++
        if ((lines || a) && z.btb > 1) d += 1
        if (z.combo > 1){
            d *= 1 + .25 * (z.combo - 1)
            if (z.combo > 2) d = Math.max(Math.log1p(1 * (z.combo - 1) * 1.25), d)
        }
        const atk = this.round(d * 1)
        let blocked = false
        if (lines || atk){ this.fight(atk); blocked = true }
        if (allclear){ z.streak += 3; this.fight(this.round((o.allclear_garbage ?? 10) * 1)) }
        if (!blocked) this.take_all()
        else if (this.continuous) z.are_until = Math.max(z.are_until, this.cur + 12)
        this.n++
        this.locked = {piece, lines, cells: this.last_cells, before, attack: atk, garbage_before: gb, frame: this.cur}
    }
    // ---- altitude ----
    award_lines(e, t = true, n = true){
        const z = this.z
        let s = .25 * Math.floor(z.rank) * e * (t ? 1 : 0)
        const i = FLOOR_AT.find(d => z.altitude < d) - z.altitude - s - z.bonus
        if (i >= 0 && i <= 2) s += 3
        z.bonus += s
        z.climb += (e + .05) * (n ? 1 : 0)
    }
    award_kill(){ const z = this.z; z.bonus += .25 * Math.floor(z.rank) * (this.mod == 'expert_reversed' ? 8 : 15) }
    update(){
        const z = this.z, f = this.cur
        let t = Math.floor(z.rank)
        if (f >= z.locked_until){ const k = this.mod == 'duo_reversed' ? 5 : this.expert ? 5 : 3; z.climb -= k * (t ** 2 + t) / 3600 }
        const s = 4 * t, i = 4 * (t - 1)
        if (t >= z.maxrank) z.climb = Math.min(z.climb, s - .05)
        if (z.climb < 0){ if (t <= 1) z.climb = 0; else { z.climb += i; z.promote = false; t-- } }
        else if (z.climb >= s){ z.climb -= s; z.promote = true; z.locked_until = f + Math.max(60, 60 * (5 - z.fatigue)); z.fatigue++; t++ }
        if (z.promote && z.climb >= 2 * (t - 1)) z.fatigue = 0
        z.rank = t + z.climb / (4 * t)
        const alt = z.altitude, a = floor_of(alt)
        if (this.mod == 'expert_reversed') z.altitude = Math.max(FLOOR_AT[a - 1], alt - .05 * (a ** 2 + a + 10) / 60)
        else z.altitude += .25 * t / 60 * speed_cap(alt)
        if (z.bonus > 0){ if (z.bonus <= .05){ z.altitude += z.bonus; z.bonus = 0 } else { const b = Math.min(10, .1 * z.bonus); z.altitude += b; z.bonus -= b } }
        if (a !== z.floor){ z.lastfloorchange = f; if (a === 1) this.e.state.glock = 240 }
        z.floor = a
        if (this.mod == 'expert_reversed' && f - z.lastfloorchange > 3600) z.recv += .005 / 60
        const r = 60 * (this.mod == 'expert_reversed' ? GRACE_REV_EX[a] : this.grace_table[a])
        if (z.grace > 0 && f >= z.lastatk + r){ z.grace--; z.lastatk = f }
        if (this.mod != 'duo_reversed'){
            const e = (this.expert ? .05 : .03) * a
            let m = 0
            if (this.o.zenith_messy) m += this.mod == 'messy_reversed' ? 1 : .25
            if (this.mod == 'allspin_reversed') m += .3
            z.change = 2.5 * (e + m); z.inner = e + m
        }
        if (z.maxmessy){ z.change = 1; z.inner = 1 }
        z.center = z.inner <= .15 && a <= 5
        z.favor = (this.expert ? 0 : 33) - 3 * a - (this.o.zenith_messy ? 25 : 0)
        if (this.mod == 'volatile_reversed'){ z.favor = 50; z.center = true }
        z.phase = this.expert ? 66 - 6 * a : 165 - 15 * a
        if (this.mod && this.mod.includes('_reversed') && !this.expert)
            z.phase = ['messy_reversed', 'volatile_reversed', 'doublehole_reversed'].includes(this.mod) ? 75 : [75, 75, 75, 75, 75, 75, 75, 60, 45, 30, 15][a]
        const l = f - z.stale
        if (l > 0 && l % 1800 == 0) z.streak += 5
        for (const [at, list] of this.fatigue) if (at === f) for (const [what, v] of list){
            if (what == 'unclearable') this.stopped = 'an unclearable row (not supported)'
            if (what == 'receivemultiplier') z.recv += v * (this.o.zenith_volatile ? 2 : 1)
            if (what == 'gracestillmessy') z.gracestillmessy = true
            if (what == 'maxmessy') z.maxmessy = true
            if (what == 'rerollcolumn') this.reroll()
        }
    }
}
