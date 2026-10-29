(function(){var u={};try{u=JSON.parse(localStorage.getItem('nummus.ui')||'{}')}catch(e){}
var t=u.theme||'dark',d=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches),r=document.documentElement;
r.dataset.theme=d?'dark':'light';if(u.accent)r.style.setProperty('--accent',u.accent);
if(u.glass===false)r.classList.add('noglass');if(u.ambient===false)r.classList.add('noambient');if(typeof u.blur==='number')r.style.setProperty('--blur',u.blur+'px');if(u.contrast)r.classList.add('hc')})();
