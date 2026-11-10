(function(LV){
  /* 층 하나 둘러보기 지점 — 복도(양 끝 · 가운데 둘) · 중앙계단 · 엘리베이터 · 비상계단 · 열린 공간 · 화장실 */
  fpSetFloor(LV);
  var y = fpSlabY(LV), N = fpNodes.slice(), V = [];
  function add(n, yaw, tag){ V.push({x:n.x, y:y, z:n.z, yaw:yaw, tag:tag}); }
  var corr = N.filter(function(n){ return n.kind === 'corr'; }).sort(function(a, b){ return a.z - b.z; });
  if(corr.length){
    var pick = [0, Math.floor(corr.length/3), Math.floor(corr.length*2/3), corr.length-1];
    pick.filter(function(v, i, a){ return a.indexOf(v) === i; }).forEach(function(i){
      add(corr[i], 0, 'corr+Z'); add(corr[i], Math.PI, 'corr-Z');
    });
  }
  N.forEach(function(n){
    if(n.kind === 'st'){ add(n, Math.PI/2, 'st in'); add({x:n.x+1.6, z:n.z}, -Math.PI/2, 'st out'); }
    if(n.kind === 'ev'){ add(n, -Math.PI/2, 'ev'); add(n, Math.PI/2, 'ev back'); }
    if(n.kind === 'es'){ var s = n.side||1; add(n, s*Math.PI/2, 'es in'); }
    if(n.kind === 'gate' || n.kind === 'hall' || n.kind === 'zone' || n.kind === 'zonedoor'){ add(n, 0, n.kind+'+Z'); add(n, Math.PI, n.kind+'-Z'); }
  });
  var open = N.filter(function(n){ return n.kind === 'open'; });
  if(open[0]){ add(open[0], -Math.PI/2, 'open'); add(open[0], 0, 'open+Z'); add(open[0], Math.PI, 'open-Z'); }
  var wc = N.filter(function(n){ return n.kind === 'wc'; });
  if(wc[0]){ add(wc[0], wc[0].faceYaw || 0, 'wc'); }
  window.__V = V;
  window.__go = function(i){ var v = __V[i]; fpPath=null; fpFaceYaw=null; fpBusy=false; fpPos.x=v.x; fpPos.y=v.y; fpPos.z=v.z; fpYaw=v.yaw; fpLookYaw=0; fpLookPitch=0; return i + ' ' + v.tag + ' (' + v.x.toFixed(1) + ',' + v.z.toFixed(1) + ')'; };
  return V.length;
})
