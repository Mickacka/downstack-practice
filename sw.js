// Offline support: every page and asset is cached on install. Requests go to the
// network first so a new version shows up as soon as it's deployed; when the network
// is down or too slow, the cached copy is used.
const CACHE = 'tetris-practice-v3'
const FILES = [
    './', 'index.html', 'downstack.html', 'pc-practice.html', 'usermode.html', 'tspin-practice.html',
    'advance-tspin-practice.html', 'allspin-practice.html', 'quad-practice.html', 'upstack-practice.html',
    'tspin-challenge.html', 'learnfromai.html', 'library.html', 'pathmode.html', '404.html', 'stats.html',
    'style.css', 'style-scripts.js', 'header.js', 'common.js', 'mapgen.js', 'simple_encode.js',
    'script.js', 'script2.js', 'script3.js', 'script4.js', 'script5.js', 'script6.js', 'script7.js', 'script8.js',
    'allspin.js', 'allspin-worker.js', 'upstack.js', 'pathmode.js', 'pathmode-queues.js', 'usermode.json', 'learnfromai.json',
    'favicon.svg', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
    'icons/maskable-512.png', 'icons/apple-touch-icon.png',
    'sound/1.ogg', 'sound/2.ogg', 'sound/3.ogg', 'sound/4.ogg', 'sound/5.ogg', 'sound/6.ogg', 'sound/7.ogg',
    'sound/win.ogg', 'sound/lose.ogg',
]
const TIMEOUT = 3000

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new Request(file, {cache: 'reload'})))).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(key => key != CACHE).map(key => caches.delete(key))))
        .then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
    const request = event.request
    const url = new URL(request.url)
    // analytics and other sites: leave alone
    if (request.method != 'GET' || url.origin != location.origin) return
    event.respondWith(network_first(request))
})

async function network_first(request){
    const cache = await caches.open(CACHE)
    // sounds are fetched in ranges: answer from the full cached file
    const key = request.headers.has('range')? request.url: request
    // revalidate with the server every time (cheap when unchanged), so the browser's
    // own cache never serves an old version while online
    const fresh = request.headers.has('range')? request: new Request(request.url, {cache: 'no-cache'})
    const network = fetch(fresh).then(response => {
        if (response.ok && response.status == 200) cache.put(key, response.clone())
        return response
    })
    network.catch(() => {})
    const timeout = new Promise(resolve => setTimeout(resolve, TIMEOUT))
    try{
        const response = await Promise.race([network, timeout])
        if (response) return response
    }
    catch(err){}
    const cached = await cache.match(key, {ignoreSearch: true})
    if (cached) return cached
    // nothing cached yet: keep waiting for the network
    return network
}
