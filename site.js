// Shared header/footer + widget boot for hub pages.
(function(){
  var p=location.pathname.split('/').pop()||'index.html';
  var L=[['index.html','🏠','Home'],['games.html','🎮','Games'],['profile.html','👤','Profile']];
  var nav=document.createElement('header');nav.className='nav';
  nav.innerHTML='<a class="logo" href="index.html"><b>🎮</b><span>Etingi <em>Games</em></span></a><nav class="links">'+L.map(function(l){return '<a href="'+l[0]+'"'+(p===l[0]?' class="on"':'')+'>'+l[2]+'</a>'}).join('')+'</nav><div id="account"></div>';
  document.body.prepend(nav);
  var tb=document.createElement('nav');tb.className='tabbar';tb.innerHTML=L.map(function(l){return '<a href="'+l[0]+'"'+(p===l[0]?' class="on"':'')+'><span>'+l[1]+'</span>'+l[2]+'</a>'}).join('');document.addEventListener('DOMContentLoaded',function(){document.body.append(tb);
  var f=document.createElement('footer');f.innerHTML='© '+new Date().getFullYear()+' Etingi Games · One account for every game · <a href="games.html">All games</a> · <a href="account.html">Account</a>';document.body.append(f);});
  var base=location.pathname.replace(/[^/]*$/,'');
  EtingiAuth.mountMenu('#account',{profileUrl:base+'profile.html',hubUrl:base+'index.html'});
})();
window.loadGames=function(){return fetch('games.json',{cache:'no-cache'}).then(function(r){return r.json()}).then(function(d){return (d.games||[]).filter(function(g){return g&&g.id&&g.name})})};
window.gameCard=function(g){var e=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return'&#'+c.charCodeAt(0)+';'})};
  var soon=g.status==='coming-soon';
  return '<article class="card"><div class="art" style="--img:url(\''+e(g.icon)+'\')">'+(g.featured?'<span class="badge">⭐ Featured</span>':soon?'<span class="badge">Coming soon</span>':'')+'<img src="'+e(g.icon)+'" alt="" loading="lazy"></div><div class="body"><span class="tl">'+e(g.category)+' · '+e(g.tagline)+'</span><h3>'+e(g.name)+'</h3><p>'+e(g.description)+'</p><div class="tags">'+(g.tags||[]).map(function(t){return'<span>'+e(t)+'</span>'}).join('')+(g.accounts&&g.accounts!=='none'?'<span>🔐 Etingi account</span>':'')+'</div>'+(soon?'<span class="btn">Coming soon</span>':'<a class="btn p" href="'+e(g.url)+'" target="_blank" rel="noopener">▶ Play now</a>')+'</div></article>'};
