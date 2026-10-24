const UP='https://taxi-game.adwalker-games.workers.dev';
const TAXI={"id":"taxi","name":"Metro Cab: Fare & Square","tagline":"3D taxi driving","description":"First-person 3D taxi driving: pick up fares, beat the clock and earn tips across the city. Best played in landscape — tap fullscreen.","icon":"/taxi/icon-192.png","url":"/taxi/","plannedUrl":"","category":"Driving","tags":["3D","driving","landscape","PWA"],"accounts":"none","offline":false,"owner":"Experiment","featured":true,"status":"live"};
const UPF='https://excite-fight.adwalker-games.workers.dev';
const FIGHT={"id":"excite-fight","name":"Excite Fight","tagline":"2D anime fighter","description":"Fast 2D anime fighting: 4 fighters, an arcade ladder, a tutorial, and online quick match or private rooms. Touch controls; best in landscape.","icon":"/fight/icon-192.png","url":"/fight/","plannedUrl":"","category":"Fighting","tags":["2D","fighting","online","2 player","landscape","PWA"],"accounts":"none","offline":false,"owner":"Experiment","featured":false,"status":"live"};
export default{async fetch(req,env){const u=new URL(req.url);const p=u.pathname;
if(p==='/taxi'){return Response.redirect(u.origin+'/taxi/'+u.search,301)}
if(p.startsWith('/taxi/')){const sub=p.slice(5)||'/';const r=await fetch(UP+sub+u.search,{method:req.method,headers:req.headers});const h=new Headers(r.headers);
 if(sub==='/'||sub==='/index.html'){let t=await r.text();t=t.replace('href="/manifest.webmanifest"','href="manifest.webmanifest"').replace(/href="\/icon-(\d+)\.png"/g,'href="icon-$1.png"');h.delete('content-length');return new Response(t,{status:r.status,headers:h})}
 if(sub==='/manifest.webmanifest'){const m=await r.json();m.start_url='/taxi/';m.scope='/taxi/';m.id='/taxi/';(m.icons||[]).forEach(i=>{i.src=i.src.replace(/^\//,'')});h.delete('content-length');h.set('content-type','application/manifest+json');return new Response(JSON.stringify(m),{status:r.status,headers:h})}
 return new Response(r.body,{status:r.status,headers:h})}
if(p==='/fight'){return Response.redirect(u.origin+'/fight/'+u.search,301)}
if(p.startsWith('/fight/')){const sub=p.slice(6)||'/';const init={method:req.method,headers:req.headers};if(req.method!=='GET'&&req.method!=='HEAD')init.body=req.body;const r=await fetch(UPF+sub+u.search,init);
 if(r.status===101||r.webSocket)return r;const h=new Headers(r.headers);
 if(sub==='/'||sub==='/index.html'){let t=await r.text();t=t.replace('href="/manifest.webmanifest"','href="manifest.webmanifest"').replace(/href="\/icon-(\d+)\.png"/g,'href="icon-$1.png"').split("location.host+'/ws?room=").join("location.host+'/fight/ws?room=").split("fetch('/mm'").join("fetch('/fight/mm'");h.delete('content-length');return new Response(t,{status:r.status,headers:h})}
 if(sub==='/manifest.webmanifest'){const m=await r.json();m.start_url='/fight/';m.scope='/fight/';m.id='/fight/';(m.icons||[]).forEach(i=>{i.src=i.src.replace(/^\//,'')});h.delete('content-length');h.set('content-type','application/manifest+json');return new Response(JSON.stringify(m),{status:r.status,headers:h})}
 return new Response(r.body,{status:r.status,headers:h})}
const res=await env.ASSETS.fetch(req);
if(p==='/games.json'&&res.ok){try{const d=await res.json();if(!(d.games||[]).some(g=>g.id==='taxi'))d.games.push(TAXI);if(!(d.games||[]).some(g=>g.id==='excite-fight'))d.games.push(FIGHT);const h=new Headers(res.headers);h.delete('content-length');return new Response(JSON.stringify(d,null,2),{status:200,headers:h})}catch(e){return env.ASSETS.fetch(req)}}
return res}}
