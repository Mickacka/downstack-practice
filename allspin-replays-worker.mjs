// Reads a replay off the page's thread (a match takes several seconds)
import { exercises_of_replay } from './allspin-replays-core.mjs'

onmessage = e => {
    var {text, file} = e.data
    // (Quick Play replays take a while: say how far it is)
    var progress = text => postMessage({file: file, progress: text})
    try{ postMessage({file: file, results: exercises_of_replay(text, file, progress)}) }
    catch(err){ postMessage({file: file, error: err.message || String(err)}) }
}
