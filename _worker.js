const UP='https://taxi-game.adwalker-games.workers.dev';
const TAXI={"id":"taxi","name":"Metro Cab: Fare & Square","tagline":"3D taxi driving","description":"First-person 3D taxi driving: pick up fares, beat the clock and earn tips across the city. Best played in landscape — tap fullscreen.","icon":"/taxi/icon-192.png","url":"/taxi/","plannedUrl":"","category":"Driving","tags":["3D","driving","landscape","PWA"],"accounts":"none","offline":false,"owner":"Experiment","featured":true,"status":"live"};
export default{async fetch(req,env){const u=new URL(req.url);const p=u.pathname;
if(p==='/taxi'){return Response.redirect(u.origin+'/taxi/'+u.search,301)}
if(p.startsWith('/taxi/')){const sub=p.slice(5)||'/';const r=await fetch(UP+sub+u.search,{method:req.method,headers:req.headers});const h=new Headers(r.headers);
 if(sub==='/'||sub==='/index.html'){let t=await r.text();t=t.replace('href="/manifest.webmanifest"','href="manifest.webmanifest"').replace(/href="\/icon-(\d+)\.png"/g,'href="icon-$1.png"');h.delete('content-length');return new Response(t,{status:r.status,headers:h})}
 if(sub==='/manifest.webmanifest'){const m=await r.json();m.start_url='/taxi/';m.scope='/taxi/';m.id='/taxi/';(m.icons||[]).forEach(i=>{i.src=i.src.replace(/^\//,'')});h.delete('content-length');h.set('content-type','application/manifest+json');return new Response(JSON.stringify(m),{status:r.status,headers:h})}
 return new Response(r.body,{status:r.status,headers:h})}
const res=await env.ASSETS.fetch(req);
if(p==='/games.json'&&res.ok){try{const d=await res.json();if(!(d.games||[]).some(g=>g.id==='taxi'))d.games.push(TAXI);const h=new Headers(res.headers);h.delete('content-length');return new Response(JSON.stringify(d,null,2),{status:200,headers:h})}catch(e){return env.ASSETS.fetch(req)}}
return res}}
