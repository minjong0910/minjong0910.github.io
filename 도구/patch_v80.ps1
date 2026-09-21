# v80 — 길찾기 그래프 (NAVGRAPH)
#
#   건물 데이터(FLOOR_LAYOUT)와 place3D 에서 점(방 문·복도·엘리베이터·계단·출입문)과
#   선(걸어가는 길)을 만들고, 다익스트라로 가장 빠른 길을 찾는다.
#
#   지금 화면 안내(buildSteps)는 v147~v151 요청을 반영해 다듬은 코드라 건드리지 않는다.
#   이 그래프는 옆에서
#     ① 모든 장소에 실제로 갈 수 있는지 (계단 없이도)
#     ② 화면 안내가 확정된 사실(왼쪽/오른쪽 복도)과 맞는지 — eval_build.html 이 확인
#     ③ 실제 축척이 정해지면 거리·시간을 내는 데 쓴다 (NAV_M_PER_UNIT)
#   를 맡는다. 축척은 현장에서 재기 전까지 비워 둔다 — 거리를 지어내지 않는다.
#
#   비용(어림값) : 걷기 1칸 = 1 · 엘리베이터 = 기다림 15 + 층마다 3 · 계단 = 층마다 12
#   지하 1층은 엘리베이터로만 잇는다 — 지하 계단 위치가 평면도에 없어서 넣지 않았다.
#
#   사용법 : pwsh -File patch_v80.ps1 <대상파일>
param([string]$Target)
$ErrorActionPreference = 'Stop'
if(-not (Test-Path $Target)){ throw "파일이 없습니다: $Target" }
$s = [System.IO.File]::ReadAllText($Target, [System.Text.Encoding]::UTF8)
$n = 0
function Swap([string]$old, [string]$new, [string]$label){
  $script:n++
  $old = $old -replace "`r`n", "`n"; $new = $new -replace "`r`n", "`n"
  $c = ([regex]::Matches($script:s, [regex]::Escape($old))).Count
  if($c -ne 1){ throw ("[{0}] 앵커가 {1}개" -f $label, $c) }
  $script:s = $script:s.Replace($old, $new)
  Write-Host ("  [OK] {0}" -f $label) -ForegroundColor Green
}

Swap @'
    case 'LNG':  return P(fl, 0, ev.z, 'lounge', false);   /* 라운지·로비 — 엘리베이터에서 내리면 보이는 홀 */
  }
  return null;
}
'@ @'
    case 'LNG':  return P(fl, 0, ev.z, 'lounge', false);   /* 라운지·로비 — 엘리베이터에서 내리면 보이는 홀 */
  }
  return null;
}

/* v80 : 길찾기 그래프 — 건물 데이터에서 점(방 문·복도·엘리베이터·계단·출입문)과 선을 만들고
   다익스트라로 가장 빠른 길을 찾는다. 화면 안내(buildSteps)는 그대로 두고, 이 그래프는
   ① 모든 장소에 갈 수 있는지 ② 안내가 맞는지 확인하고 ③ 축척이 정해지면 거리·시간을 낸다.
   비용(어림값) : 걷기 1칸 = 1 · 엘리베이터 = 기다림 15 + 층마다 3 · 계단 = 층마다 12.
   지하 1층은 엘리베이터로만 잇는다 (지하 계단 위치가 평면도에 없다). */
var NAV_M_PER_UNIT = null;   /* 1칸이 몇 m 인가 — 현장에서 재기 전에는 비워 둔다. 거리를 지어내지 않는다 */
var NAVGRAPH = (function(){
  var N = {}, E = {}, codeNode = {}, built = false;
  var WAIT = 15, LIFT = 3, STAIR = 12;
  function node(id, floor, x, z, kind, code){
    if(!N[id]) N[id] = {id:id, floor:floor, x:x, z:z, kind:kind, code:code || null};
    E[id] = E[id] || [];
    return id;
  }
  function link(a, b, w, kind, oneWay){
    E[a].push({to:b, w:w, kind:kind || 'walk'});
    if(!oneWay) E[b].push({to:a, w:w, kind:kind || 'walk'});
  }
  function dist(a, b){ var p = N[a], q = N[b]; return Math.sqrt((p.x-q.x)*(p.x-q.x) + (p.z-q.z)*(p.z-q.z)); }
  function nearestCorridor(floor, x, z){
    var best = null, bd = 1e9;
    Object.keys(N).forEach(function(id){
      var q = N[id]; if(q.floor !== floor || q.kind !== 'corridor') return;
      var d = Math.sqrt((q.x-x)*(q.x-x) + (q.z-z)*(q.z-z)); if(d < bd){ bd = d; best = id; }
    });
    return best;
  }
  function build(){
    if(built) return; built = true;
    for(var lv = 1; lv <= FLOORS; lv++){
      var L = FLOOR_LAYOUT[lv]; if(!L) continue;
      /* 복도 중앙선 위의 점 — 복도 양 끝 · 엘리베이터 앞 · 계단 앞 · 방마다 문 앞 · 화장실 앞 */
      var zs = {};
      var addZ = function(z){ zs[z.toFixed(2)] = z; };
      addZ(L.topOuterZ); addZ(L.bottomOuterZ); addZ(L.evZ); addZ(L.stZ); addZ(FACILITIES.toilet.z);
      L.cells.forEach(function(c){ if(c.code) addZ(c.z); });
      if(lv === 1) ['MAIN', 'BACK', 'EAST', 'WEST'].forEach(function(k){   /* 출입문은 제 자리에서 복도와 만난다 */
        var g = gateXZ(k); if(g) addZ(Math.max(L.bottomOuterZ, Math.min(L.topOuterZ, g.z)));
      });
      var zl = Object.keys(zs).map(function(k){ return zs[k]; }).sort(function(a, b){ return a - b; });
      var corr = function(z){ return 'C' + lv + '@' + z.toFixed(2); };
      zl.forEach(function(z){ node(corr(z), lv, 0, z, 'corridor'); });
      for(var i = 1; i < zl.length; i++) link(corr(zl[i-1]), corr(zl[i]), zl[i] - zl[i-1]);
      /* 엘리베이터 — 탈 때만 기다림 비용 (그래서 한쪽 방향 선 두 개) */
      node('EV' + lv, lv, L.coreX, L.evZ, 'lift', 'EV' + lv);
      link(corr(L.evZ), 'EV' + lv, L.coreX + WAIT, 'walk', true);
      link('EV' + lv, corr(L.evZ), L.coreX, 'walk', true);
      node('ST' + lv, lv, L.coreX, L.stZ, 'stairs', 'ES' + lv);
      link(corr(L.stZ), 'ST' + lv, L.coreX);
      /* 방 — 복도 쪽 벽의 문 */
      L.cells.forEach(function(c){
        if(!c.code) return;
        var id = node('R' + lv + ':' + c.code, lv, (c.x > 0 ? CORR_HALF : -CORR_HALF), c.z, 'room', c.code);
        link(corr(c.z), id, CORR_HALF);
        codeNode[String(c.code).toUpperCase()] = id;
        if(c.parent && !codeNode[String(c.parent).toUpperCase()]) codeNode[String(c.parent).toUpperCase()] = id;
      });
      node('WC' + lv, lv, -CORR_HALF, FACILITIES.toilet.z, 'toilet', 'WC' + lv);
      link(corr(FACILITIES.toilet.z), 'WC' + lv, CORR_HALF);
      var es = EMSTAIR_POS[lv];
      if(es){
        node('EMS' + lv, lv, es.xWhole, es.z, 'emstair', 'EMS' + lv);
        link(corr(L.bottomOuterZ), 'EMS' + lv, dist(corr(L.bottomOuterZ), 'EMS' + lv));
        codeNode['EMS' + lv] = 'EMS' + lv;
      }
      codeNode['EV' + lv] = 'EV' + lv; codeNode['EVIN' + lv] = 'EV' + lv;
      codeNode['ES' + lv] = 'ST' + lv; codeNode['WC' + lv] = 'WC' + lv;
      /* 구역·어림한 곳 — place3D 좌표에서 가장 가까운 복도 점 */
      ['HALL' + lv + 'L', 'HALL' + lv + 'R', 'LNG' + lv, 'SIGN' + lv, 'WIN' + lv, 'WIN' + lv + 'L', 'WIN' + lv + 'R'].forEach(function(code){
        var p = place3D(code); if(p) codeNode[code] = nearestCorridor(lv, 0, p.z);
      });
      if(lv > 1){
        link('EV' + (lv-1), 'EV' + lv, LIFT, 'lift');
        link('ST' + (lv-1), 'ST' + lv, STAIR, 'stairs');
        if(N['EMS' + (lv-1)] && N['EMS' + lv]) link('EMS' + (lv-1), 'EMS' + lv, STAIR, 'stairs');
      }
    }
    ['MAIN', 'BACK', 'EAST', 'WEST'].forEach(function(k){
      var g = gateXZ(k); if(!g) return;
      var id = node('GATE_' + k, 1, g.x, g.z, 'gate', 'GATE_' + k);
      var c = nearestCorridor(1, g.x, g.z); if(c) link(id, c, dist(id, c));
      codeNode['GATE_' + k] = id;
    });
    codeNode.GATE_E = codeNode.GATE_EAST; codeNode.GATE_W = codeNode.GATE_WEST;
    var eb = evXZ('B1');
    node('EVB1', 'B1', eb.x, eb.z, 'lift', 'EVB1');
    node('ZB1', 'B1', B1_ZONE_MID_X, B1_ZONE_MID_Z, 'zone', 'B1');
    link('ZB1', 'EVB1', dist('ZB1', 'EVB1') + WAIT, 'walk', true);
    link('EVB1', 'ZB1', dist('ZB1', 'EVB1'), 'walk', true);
    if(N.EV1) link('EVB1', 'EV1', LIFT, 'lift');
    codeNode.EVB1 = 'EVB1'; codeNode.B1 = 'ZB1';
  }
  /* 가장 빠른 길 — opt.noStairs 면 계단 선을 쓰지 않는다 (휠체어·무거운 짐) */
  function route(fromCode, toCode, opt){
    build(); opt = opt || {};
    var s = codeNode[String(fromCode).toUpperCase()], t = codeNode[String(toCode).toUpperCase()];
    if(!s || !t) return {ok:false, why: !s ? '출발 장소를 그래프에서 모름' : '도착 장소를 그래프에서 모름'};
    var D = {}, prev = {}, done = {}, Q = [s]; D[s] = 0;
    while(Q.length){
      var bi = 0; for(var i = 1; i < Q.length; i++) if(D[Q[i]] < D[Q[bi]]) bi = i;
      var u = Q.splice(bi, 1)[0];
      if(done[u]) continue; done[u] = 1;
      if(u === t) break;
      E[u].forEach(function(e){
        if(opt.noStairs && e.kind === 'stairs') return;
        var nd = D[u] + e.w;
        if(D[e.to] === undefined || nd < D[e.to]){ D[e.to] = nd; prev[e.to] = {from:u, kind:e.kind}; Q.push(e.to); }
      });
    }
    if(D[t] === undefined) return {ok:false, why:'이어지는 길이 없음'};
    var path = [t], walk = 0, lift = 0, stairs = 0, x = t;
    while(x !== s){
      var p = prev[x];
      if(p.kind === 'walk') walk += dist(p.from, x);
      else if(p.kind === 'lift') lift++;
      else if(p.kind === 'stairs') stairs++;
      x = p.from; path.unshift(x);
    }
    return {ok:true, cost:D[t], walk:walk, liftFloors:lift, stairFloors:stairs, path:path,
            points: path.map(function(id){ var q = N[id]; return {floor:q.floor, x:q.x, z:q.z, kind:q.kind}; }),
            meters: NAV_M_PER_UNIT ? walk * NAV_M_PER_UNIT : null};
  }
  return {
    route: route,
    has: function(code){ build(); return !!codeNode[String(code).toUpperCase()]; },
    stats: function(){ build(); var e = 0; Object.keys(E).forEach(function(k){ e += E[k].length; });
                       return {nodes:Object.keys(N).length, edges:e, places:Object.keys(codeNode).length}; },
    nodes: function(){ build(); return N; }
  };
})();
'@ '길찾기 그래프'

[System.IO.File]::WriteAllText($Target, $s, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("  -> {0}  ({1} 군데)" -f (Split-Path $Target -Leaf), $n)
