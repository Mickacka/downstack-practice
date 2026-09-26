// Background planner for All-Spin's continuous mode: plans the next part while the
// current one is played (see prepare_next_part in allspin.js). It runs the page's
// generator, with stand-ins for what the page scripts expect from the page.
var PLANNER = true
self.window = self
var page_stub = {addEventListener(){}, getElementById: () => page_stub, focus(){}}
self.document = page_stub
var stored = {}
self.localStorage = {getItem: key => key in stored? stored[key]: null, setItem(key, value){ stored[key] = String(value) },
    removeItem(key){ delete stored[key] }}
var Controls = {}
var Daily = {on: false, seeding: false}
const clone = (items) => items.map(item => Array.isArray(item) ? clone(item) : item)
function budget_clock(){ return Date.now() }
function is_daily_map(){ return false }
importScripts('header.js', 'allspin.js')

onmessage = e => {
    var {id, board, key, cleared, config, stats} = e.data
    Object.assign(Config, config)
    if (stats) stored.allspin_spin_stats = stats
    draw_mix_plan()
    var plan = plan_next_part(board, cleared)
    postMessage({id: id, key: key, plan: plan, fresh: plan? null: new_map()})
}
