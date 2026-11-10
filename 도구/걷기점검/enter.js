(async function(){
  function sl(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  for(var i=0;i<120 && !window.appBooted;i++) await sl(250);
  document.querySelectorAll('.ezAsk').forEach(function(e){ e.remove(); });
  var b=[].slice.call(document.querySelectorAll('#s1 button')).filter(function(x){ return /시작하기/.test(x.textContent); })[0]; if(b) b.click();
  await sl(1200);
  var q=document.getElementById('nq'); go(q.closest('.screen').id);
  q.value='13524'; roomSearch('13524'); await sl(400); searchEnter(); await sl(2200);
  var c=[].slice.call(document.querySelectorAll('button')).filter(function(x){ return /중앙계단/.test(x.textContent) && /걸어서/.test(x.textContent); });
  if(c.length) c[c.length-1].click();
  await sl(2500);
  document.querySelectorAll('.ezAsk').forEach(function(e){ e.remove(); });
  var w=[].slice.call(document.querySelectorAll('#s4 button')).filter(function(x){ return /직접 걸어보기/.test(x.textContent); })[0]; if(w) w.click();
  await sl(4000);
  var fb=document.getElementById('fsBtn'); if(fb && !document.querySelector('.fs, .fsOn, #s4.fs')) fb.click();
  await sl(1200);
  window.__at=function(x,y,z,yaw,pit){ fpPath=null; fpFaceYaw=null; fpBusy=false; fpPos.x=x; fpPos.y=y; fpPos.z=z; fpYaw=yaw; fpLookYaw=0; fpLookPitch=pit||0; return 'ok'; };
  return 'free=' + window.fpFree + ' screen=' + document.querySelector('.screen.on').id;
})()
