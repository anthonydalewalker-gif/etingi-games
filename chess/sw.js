const C='etingi-chess-v3';
const FILES=['./','./index.html','./config.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./vendor/three.module.min.js','./vendor/OrbitControls.js','./vendor/BufferGeometryUtils.js','./vendor/chess.js','./vendor/supabase.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/'))return; // online traffic always goes to the network
 const page=r.mode==='navigate'||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/config.js')||u.pathname==='/'||u.pathname.startsWith('/shared/');
 if(page){e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));return res;}).catch(()=>caches.match(r,{ignoreSearch:true})));return;} // network-first so updates arrive
 e.respondWith(caches.match(r,{ignoreSearch:true}).then(c=>c||fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(x=>x.put(r,cp));return res;})));});
